import type { SupabaseClient } from "@supabase/supabase-js";

export const BACKUP_VERSION: number;
export const PHOTO_BUCKET: string;
export type BackupData = { version: number; exported_at: string; user_id: string; tables: Record<string, Record<string, unknown>[]> };
export function exportAccount(client: SupabaseClient): Promise<{ data: BackupData; photos: Map<string, Uint8Array>; missingPhotos: string[] }>;
export function itemPayload(item: Record<string, unknown>): Record<string, unknown>;
export function importAccount(
  client: SupabaseClient, data: BackupData, readPhoto: (mealId: string) => Promise<Uint8Array | null>, newRequestId: () => string,
): Promise<{ profile: boolean; goals: number; foods: number; weight_logs: number; meals: number; photos: number; photoErrors: number }>;
