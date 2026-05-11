'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  BusinessCard,
  Confidence,
  DetectedLanguage,
  InterestedService,
} from '@/types/business-card';
import type {
  CardRepository,
  NewBusinessCard,
  UpdateBusinessCard,
} from './repository';

const BUCKET = 'card-images';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

interface CardRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  front_image_path: string;
  back_image_path: string | null;
  company_name: string;
  website: string | null;
  website_guessed: boolean | null;
  country_name: string | null;
  country_code: string | null;
  person_name: string;
  person_name_en: string | null;
  position: string | null;
  industry: string | null;
  company_type: string | null;
  company_description: string | null;
  phone_company: string | null;
  phone_mobile: string | null;
  email: string | null;
  fax: string | null;
  interested_service: string;
  interested_service_other: string | null;
  note: string | null;
  detected_language: string | null;
  ai_filled_fields: string[] | null;
  ai_confidence: Record<string, Confidence> | null;
}

export class SupabaseCardRepository implements CardRepository {
  private supabase: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? createSupabaseBrowserClient();
  }

  private async currentUserId(): Promise<string> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) throw new Error('Not authenticated');
    return data.user.id;
  }

  private async signedUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data) throw new Error(`Failed to sign URL for ${path}: ${error?.message}`);
    return data.signedUrl;
  }

  private async rowToCard(row: CardRow): Promise<BusinessCard> {
    const frontImageUrl = await this.signedUrl(row.front_image_path);
    const backImageUrl = row.back_image_path
      ? await this.signedUrl(row.back_image_path)
      : undefined;

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      frontImageUrl,
      backImageUrl,
      companyName: row.company_name,
      website: row.website ?? undefined,
      websiteGuessed: row.website_guessed ?? undefined,
      country:
        row.country_name && row.country_code
          ? { name: row.country_name, code: row.country_code }
          : undefined,
      personName: row.person_name,
      personNameEn: row.person_name_en ?? undefined,
      position: row.position ?? undefined,
      industry: row.industry ?? undefined,
      companyType: row.company_type ?? undefined,
      companyDescription: row.company_description ?? undefined,
      phoneCompany: row.phone_company ?? undefined,
      phoneMobile: row.phone_mobile ?? undefined,
      email: row.email ?? undefined,
      fax: row.fax ?? undefined,
      interestedService: row.interested_service as InterestedService,
      interestedServiceOther: row.interested_service_other ?? undefined,
      note: row.note ?? undefined,
      detectedLanguage: (row.detected_language as DetectedLanguage) ?? undefined,
      aiFilledFields: row.ai_filled_fields ?? [],
      aiConfidence: row.ai_confidence ?? undefined,
    };
  }

  async save(card: NewBusinessCard): Promise<BusinessCard> {
    const userId = await this.currentUserId();
    const id = crypto.randomUUID();
    const frontPath = `${userId}/${id}/front.jpg`;
    const backPath = card.backImage ? `${userId}/${id}/back.jpg` : null;

    const { error: frontErr } = await this.supabase.storage
      .from(BUCKET)
      .upload(frontPath, card.frontImage, { contentType: 'image/jpeg', upsert: false });
    if (frontErr) throw new Error(`Front image upload failed: ${frontErr.message}`);

    if (card.backImage && backPath) {
      const { error: backErr } = await this.supabase.storage
        .from(BUCKET)
        .upload(backPath, card.backImage, { contentType: 'image/jpeg', upsert: false });
      if (backErr) throw new Error(`Back image upload failed: ${backErr.message}`);
    }

    const { data, error } = await this.supabase
      .from('cards')
      .insert({
        id,
        user_id: userId,
        front_image_path: frontPath,
        back_image_path: backPath,
        company_name: card.companyName,
        website: card.website ?? null,
        website_guessed: card.websiteGuessed ?? false,
        country_name: card.country?.name ?? null,
        country_code: card.country?.code ?? null,
        person_name: card.personName,
        person_name_en: card.personNameEn ?? null,
        position: card.position ?? null,
        industry: card.industry ?? null,
        company_type: card.companyType ?? null,
        company_description: card.companyDescription ?? null,
        phone_company: card.phoneCompany ?? null,
        phone_mobile: card.phoneMobile ?? null,
        email: card.email ?? null,
        fax: card.fax ?? null,
        interested_service: card.interestedService,
        interested_service_other: card.interestedServiceOther ?? null,
        note: card.note ?? null,
        detected_language: card.detectedLanguage ?? null,
        ai_filled_fields: card.aiFilledFields,
        ai_confidence: card.aiConfidence ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      // Best-effort: clean up the uploaded blob(s) so we don't leak storage on a row failure.
      await this.supabase.storage.from(BUCKET).remove(
        [frontPath, ...(backPath ? [backPath] : [])]
      );
      throw new Error(`Card insert failed: ${error?.message ?? 'unknown'}`);
    }

    return this.rowToCard(data as CardRow);
  }

  async list(): Promise<BusinessCard[]> {
    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Card list failed: ${error.message}`);
    return Promise.all((data as CardRow[]).map((row) => this.rowToCard(row)));
  }

  async getLatest(): Promise<BusinessCard | undefined> {
    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`getLatest failed: ${error.message}`);
    if (!data) return undefined;
    return this.rowToCard(data as CardRow);
  }

  async getById(id: string): Promise<BusinessCard | undefined> {
    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`getById failed: ${error.message}`);
    if (!data) return undefined;
    return this.rowToCard(data as CardRow);
  }

  async update(id: string, patch: UpdateBusinessCard): Promise<BusinessCard> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.companyName !== undefined) row.company_name = patch.companyName;
    if (patch.website !== undefined) row.website = patch.website ?? null;
    if (patch.websiteGuessed !== undefined) row.website_guessed = patch.websiteGuessed;
    if (patch.country !== undefined) {
      row.country_name = patch.country?.name ?? null;
      row.country_code = patch.country?.code ?? null;
    }
    if (patch.personName !== undefined) row.person_name = patch.personName;
    if (patch.personNameEn !== undefined) row.person_name_en = patch.personNameEn ?? null;
    if (patch.position !== undefined) row.position = patch.position ?? null;
    if (patch.industry !== undefined) row.industry = patch.industry ?? null;
    if (patch.companyType !== undefined) row.company_type = patch.companyType ?? null;
    if (patch.companyDescription !== undefined) row.company_description = patch.companyDescription ?? null;
    if (patch.phoneCompany !== undefined) row.phone_company = patch.phoneCompany ?? null;
    if (patch.phoneMobile !== undefined) row.phone_mobile = patch.phoneMobile ?? null;
    if (patch.email !== undefined) row.email = patch.email ?? null;
    if (patch.fax !== undefined) row.fax = patch.fax ?? null;
    if (patch.interestedService !== undefined) row.interested_service = patch.interestedService;
    if (patch.interestedServiceOther !== undefined)
      row.interested_service_other = patch.interestedServiceOther ?? null;
    if (patch.note !== undefined) row.note = patch.note ?? null;
    if (patch.detectedLanguage !== undefined)
      row.detected_language = patch.detectedLanguage ?? null;
    if (patch.aiFilledFields !== undefined) row.ai_filled_fields = patch.aiFilledFields;
    if (patch.aiConfidence !== undefined) row.ai_confidence = patch.aiConfidence ?? null;

    const { data, error } = await this.supabase
      .from('cards')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(`Card update failed: ${error?.message ?? 'unknown'}`);
    return this.rowToCard(data as CardRow);
  }

  async delete(id: string): Promise<void> {
    // Look up the row to find storage paths before removing
    const { data: row, error: selectErr } = await this.supabase
      .from('cards')
      .select('front_image_path, back_image_path')
      .eq('id', id)
      .maybeSingle();
    if (selectErr) throw new Error(`delete pre-fetch failed: ${selectErr.message}`);

    const { error: deleteErr } = await this.supabase.from('cards').delete().eq('id', id);
    if (deleteErr) throw new Error(`Card delete failed: ${deleteErr.message}`);

    if (row) {
      const paths = [row.front_image_path, row.back_image_path].filter(
        (p): p is string => typeof p === 'string'
      );
      if (paths.length > 0) {
        await this.supabase.storage.from(BUCKET).remove(paths);
      }
    }
  }
}

let singleton: SupabaseCardRepository | null = null;
export function getCardRepository(): SupabaseCardRepository {
  if (typeof window === 'undefined') {
    throw new Error('CardRepository is only available in the browser');
  }
  if (!singleton) singleton = new SupabaseCardRepository();
  return singleton;
}
