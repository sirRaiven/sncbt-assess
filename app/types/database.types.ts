export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          allow_backtracking: boolean
          archived_at: string | null
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          classroom_id: string
          created_at: string
          id: string
          instructions: string | null
          instructor_id: string
          leaderboard_enabled: boolean
          overall_time_limit_seconds: number | null
          published_at: string | null
          question_count: number
          randomize_options: boolean
          randomize_questions: boolean
          result_visibility: Database["public"]["Enums"]["assessment_result_visibility"]
          scoring_mode: Database["public"]["Enums"]["assessment_scoring_mode"]
          source_assessment_id: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          subject_code: string
          subject_name: string
          title: string
          total_points: number
          updated_at: string
          version: number
        }
        Insert: {
          allow_backtracking?: boolean
          archived_at?: string | null
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          classroom_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          instructor_id: string
          leaderboard_enabled?: boolean
          overall_time_limit_seconds?: number | null
          published_at?: string | null
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          result_visibility?: Database["public"]["Enums"]["assessment_result_visibility"]
          scoring_mode?: Database["public"]["Enums"]["assessment_scoring_mode"]
          source_assessment_id?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          subject_code: string
          subject_name: string
          title: string
          total_points?: number
          updated_at?: string
          version?: number
        }
        Update: {
          allow_backtracking?: boolean
          archived_at?: string | null
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          classroom_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          instructor_id?: string
          leaderboard_enabled?: boolean
          overall_time_limit_seconds?: number | null
          published_at?: string | null
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          result_visibility?: Database["public"]["Enums"]["assessment_result_visibility"]
          scoring_mode?: Database["public"]["Enums"]["assessment_scoring_mode"]
          source_assessment_id?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          subject_code?: string
          subject_name?: string
          title?: string
          total_points?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_source_assessment_id_fkey"
            columns: ["source_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          metadata?: Json
        }
        Relationships: []
      }
      classroom_members: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classroom_id: string
          created_at: string
          id: string
          left_at: string | null
          membership_status: Database["public"]["Enums"]["classroom_membership_status"]
          rejected_at: string | null
          removed_at: string | null
          requested_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classroom_id: string
          created_at?: string
          id?: string
          left_at?: string | null
          membership_status?: Database["public"]["Enums"]["classroom_membership_status"]
          rejected_at?: string | null
          removed_at?: string | null
          requested_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classroom_id?: string
          created_at?: string
          id?: string
          left_at?: string | null
          membership_status?: Database["public"]["Enums"]["classroom_membership_status"]
          rejected_at?: string | null
          removed_at?: string | null
          requested_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_members_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          join_code: string
          join_enabled: boolean
          name: string
          school_year: string
          section: string
          semester: string
          status: Database["public"]["Enums"]["classroom_status"]
          subject_code: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          join_code: string
          join_enabled?: boolean
          name: string
          school_year: string
          section: string
          semester: string
          status?: Database["public"]["Enums"]["classroom_status"]
          subject_code: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          join_code?: string
          join_enabled?: boolean
          name?: string
          school_year?: string
          section?: string
          semester?: string
          status?: Database["public"]["Enums"]["classroom_status"]
          subject_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          created_at: string
          email: string | null
          employee_number: string | null
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          role: Database["public"]["Enums"]["user_role"]
          student_number: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          employee_number?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          middle_name?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          role?: Database["public"]["Enums"]["user_role"]
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          employee_number?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          role?: Database["public"]["Enums"]["user_role"]
          student_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_account_status: {
        Args: never
        Returns: Database["public"]["Enums"]["account_status"]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "rejected"
      assessment_result_visibility:
        | "hidden"
        | "score_only"
        | "score_and_answers"
      assessment_scoring_mode: "standard" | "speed_bonus"
      assessment_status: "draft" | "published" | "archived"
      assessment_type: "quiz" | "examination" | "activity" | "practice"
      classroom_membership_status:
        | "pending"
        | "active"
        | "rejected"
        | "removed"
        | "left"
      classroom_status: "active" | "archived"
      user_role: "admin" | "instructor" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "suspended", "rejected"],
      assessment_result_visibility: [
        "hidden",
        "score_only",
        "score_and_answers",
      ],
      assessment_scoring_mode: ["standard", "speed_bonus"],
      assessment_status: ["draft", "published", "archived"],
      assessment_type: ["quiz", "examination", "activity", "practice"],
      classroom_membership_status: [
        "pending",
        "active",
        "rejected",
        "removed",
        "left",
      ],
      classroom_status: ["active", "archived"],
      user_role: ["admin", "instructor", "student"],
    },
  },
} as const
