
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "request_count": number,"updated_at": string,"usage_date": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "request_count"?: number,"updated_at"?: string,"usage_date": string,"user_id": string
                  }
                  Update: {
                    "request_count"?: number,"updated_at"?: string,"usage_date"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"foods": {
                  Row: {
                    "basis_quantity": number,"basis_type": string,"basis_unit": string,"brand": string | null,"carbs_g": number,"created_at": string,"fat_g": number,"id": string,"is_favorite": boolean,"kcal": number,"last_used_at": string | null,"name": string,"protein_g": number,"serving_label": string | null,"serving_mass_g": number | null,"serving_volume_ml": number | null,"source": string,"source_note": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "basis_quantity": number,"basis_type": string,"basis_unit": string,"brand"?: string | null,"carbs_g": number,"created_at"?: string,"fat_g": number,"id"?: string,"is_favorite"?: boolean,"kcal": number,"last_used_at"?: string | null,"name": string,"protein_g": number,"serving_label"?: string | null,"serving_mass_g"?: number | null,"serving_volume_ml"?: number | null,"source": string,"source_note"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "basis_quantity"?: number,"basis_type"?: string,"basis_unit"?: string,"brand"?: string | null,"carbs_g"?: number,"created_at"?: string,"fat_g"?: number,"id"?: string,"is_favorite"?: boolean,"kcal"?: number,"last_used_at"?: string | null,"name"?: string,"protein_g"?: number,"serving_label"?: string | null,"serving_mass_g"?: number | null,"serving_volume_ml"?: number | null,"source"?: string,"source_note"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"goals": {
                  Row: {
                    "baseline_weight_kg": number | null,"carbs_g": number,"created_at": string,"daily_kcal": number,"effective_from": string,"fat_g": number,"goal_type": string,"id": string,"protein_g": number,"target_weight_kg": number | null,"user_id": string,"weekly_adjustment_kcal": number
                  }
                  ComputedFields: never
                  Insert: {
                    "baseline_weight_kg"?: number | null,"carbs_g": number,"created_at"?: string,"daily_kcal": number,"effective_from": string,"fat_g": number,"goal_type": string,"id"?: string,"protein_g": number,"target_weight_kg"?: number | null,"user_id"?: string,"weekly_adjustment_kcal"?: number
                  }
                  Update: {
                    "baseline_weight_kg"?: number | null,"carbs_g"?: number,"created_at"?: string,"daily_kcal"?: number,"effective_from"?: string,"fat_g"?: number,"goal_type"?: string,"id"?: string,"protein_g"?: number,"target_weight_kg"?: number | null,"user_id"?: string,"weekly_adjustment_kcal"?: number
                  }
                  Relationships: [
                    
                  ]
                },"meal_items": {
                  Row: {
                    "assumptions_snapshot": NonNullable<Json>,"base_carbs_g_snapshot": number,"base_fat_g_snapshot": number,"base_kcal_snapshot": number,"base_protein_g_snapshot": number,"basis_quantity_snapshot": number,"basis_type_snapshot": string,"basis_unit_snapshot": string,"consumed_quantity": number,"consumed_unit": string,"conversion_snapshot": Json | null,"created_at": string,"food_id": string | null,"id": string,"manual_override": boolean,"meal_id": string,"name_snapshot": string,"position": number,"serving_label_snapshot": string | null,"serving_mass_g_snapshot": number | null,"serving_volume_ml_snapshot": number | null,"source_snapshot": string,"total_carbs_g": number,"total_fat_g": number,"total_kcal": number,"total_protein_g": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assumptions_snapshot"?: NonNullable<Json>,"base_carbs_g_snapshot": number,"base_fat_g_snapshot": number,"base_kcal_snapshot": number,"base_protein_g_snapshot": number,"basis_quantity_snapshot": number,"basis_type_snapshot": string,"basis_unit_snapshot": string,"consumed_quantity": number,"consumed_unit": string,"conversion_snapshot"?: Json | null,"created_at"?: string,"food_id"?: string | null,"id"?: string,"manual_override"?: boolean,"meal_id": string,"name_snapshot": string,"position": number,"serving_label_snapshot"?: string | null,"serving_mass_g_snapshot"?: number | null,"serving_volume_ml_snapshot"?: number | null,"source_snapshot": string,"total_carbs_g": number,"total_fat_g": number,"total_kcal": number,"total_protein_g": number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "assumptions_snapshot"?: NonNullable<Json>,"base_carbs_g_snapshot"?: number,"base_fat_g_snapshot"?: number,"base_kcal_snapshot"?: number,"base_protein_g_snapshot"?: number,"basis_quantity_snapshot"?: number,"basis_type_snapshot"?: string,"basis_unit_snapshot"?: string,"consumed_quantity"?: number,"consumed_unit"?: string,"conversion_snapshot"?: Json | null,"created_at"?: string,"food_id"?: string | null,"id"?: string,"manual_override"?: boolean,"meal_id"?: string,"name_snapshot"?: string,"position"?: number,"serving_label_snapshot"?: string | null,"serving_mass_g_snapshot"?: number | null,"serving_volume_ml_snapshot"?: number | null,"source_snapshot"?: string,"total_carbs_g"?: number,"total_fat_g"?: number,"total_kcal"?: number,"total_protein_g"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_items_user_id_food_id_fkey"
      columns: ["user_id","food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "meal_items_user_id_meal_id_fkey"
      columns: ["user_id","meal_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"meals": {
                  Row: {
                    "created_at": string,"eaten_at": string,"id": string,"meal_date": string,"meal_type": string,"note": string | null,"photo_path": string | null,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"eaten_at"?: string,"id"?: string,"meal_date": string,"meal_type": string,"note"?: string | null,"photo_path"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"eaten_at"?: string,"id"?: string,"meal_date"?: string,"meal_type"?: string,"note"?: string | null,"photo_path"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mutation_requests": {
                  Row: {
                    "created_at": string,"operation": string,"payload_hash": string,"request_id": string,"result_json": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"operation": string,"payload_hash": string,"request_id": string,"result_json"?: Json | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"operation"?: string,"payload_hash"?: string,"request_id"?: string,"result_json"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "activity_level": string | null,"age_years": number | null,"allergies": string,"body_fat_pct": number | null,"created_at": string,"display_name": string | null,"favorite_foods": string,"frequent_foods": string,"height_cm": number | null,"id": string,"sex_for_formula": string | null,"timezone": string,"unit_system": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_level"?: string | null,"age_years"?: number | null,"allergies"?: string,"body_fat_pct"?: number | null,"created_at"?: string,"display_name"?: string | null,"favorite_foods"?: string,"frequent_foods"?: string,"height_cm"?: number | null,"id": string,"sex_for_formula"?: string | null,"timezone"?: string,"unit_system"?: string,"updated_at"?: string
                  }
                  Update: {
                    "activity_level"?: string | null,"age_years"?: number | null,"allergies"?: string,"body_fat_pct"?: number | null,"created_at"?: string,"display_name"?: string | null,"favorite_foods"?: string,"frequent_foods"?: string,"height_cm"?: number | null,"id"?: string,"sex_for_formula"?: string | null,"timezone"?: string,"unit_system"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weight_logs": {
                  Row: {
                    "created_at": string,"id": string,"logged_date": string,"note": string | null,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"logged_date": string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"logged_date"?: string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_ai_quota":
{ Args: { "p_daily_limit": number }; Returns: number
                           },
"daily_totals":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "carbs_g": number,"fat_g": number,"kcal": number,"meal_date": string,"protein_g": number
            }[]
                           },
"save_meal":
{ Args: { "p_expected_revision"?: number,"p_items": Json,"p_meal": Json,"p_meal_id"?: string,"p_request_id": string }; Returns: Json
                           },
"save_profile_goal":
{ Args: { "p_goal": Json,"p_profile": Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
