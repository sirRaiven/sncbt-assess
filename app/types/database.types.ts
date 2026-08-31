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
      accounts: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string | null
          id: string
          requested_role: Database["public"]["Enums"]["user_role"]
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          id: string
          requested_role?: Database["public"]["Enums"]["user_role"]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          id?: string
          requested_role?: Database["public"]["Enums"]["user_role"]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          middle_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_assignments: {
        Row: {
          assessment_id: string
          cancelled_at: string | null
          classroom_id: string
          closed_at: string | null
          created_at: string
          ends_at: string
          focus_mode_enabled: boolean
          id: string
          instructor_id: string
          integrity_monitoring_enabled: boolean
          max_attempts: number
          show_leaderboard: boolean
          starts_at: string
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          cancelled_at?: string | null
          classroom_id: string
          closed_at?: string | null
          created_at?: string
          ends_at: string
          focus_mode_enabled?: boolean
          id?: string
          instructor_id: string
          integrity_monitoring_enabled?: boolean
          max_attempts?: number
          show_leaderboard?: boolean
          starts_at: string
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          cancelled_at?: string | null
          classroom_id?: string
          closed_at?: string | null
          created_at?: string
          ends_at?: string
          focus_mode_enabled?: boolean
          id?: string
          instructor_id?: string
          integrity_monitoring_enabled?: boolean
          max_attempts?: number
          show_leaderboard?: boolean
          starts_at?: string
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_assignment_schedule_events: {
        Row: {
          action: string
          assessment_id: string
          assignment_id: string
          classroom_id: string
          created_at: string
          id: string
          instructor_id: string
          new_ends_at: string
          new_starts_at: string
          previous_ends_at: string
          previous_starts_at: string
          reason: string | null
        }
        Insert: {
          action: string
          assessment_id: string
          assignment_id: string
          classroom_id: string
          created_at?: string
          id?: string
          instructor_id: string
          new_ends_at: string
          new_starts_at: string
          previous_ends_at: string
          previous_starts_at: string
          reason?: string | null
        }
        Update: {
          action?: string
          assessment_id?: string
          assignment_id?: string
          classroom_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
          new_ends_at?: string
          new_starts_at?: string
          previous_ends_at?: string
          previous_starts_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignment_schedule_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignment_schedule_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignment_schedule_events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignment_schedule_events_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_student_access_grants: {
        Row: {
          additional_attempts: number
          assessment_id: string
          assignment_id: string
          classroom_id: string
          consumed_at: string | null
          consumed_attempt_id: string | null
          created_at: string
          ends_at: string
          grant_type: string
          id: string
          instructor_id: string
          reason: string | null
          revoked_at: string | null
          starts_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          additional_attempts?: number
          assessment_id: string
          assignment_id: string
          classroom_id: string
          consumed_at?: string | null
          consumed_attempt_id?: string | null
          created_at?: string
          ends_at: string
          grant_type: string
          id?: string
          instructor_id: string
          reason: string | null
          revoked_at?: string | null
          starts_at: string
          student_id: string
          updated_at?: string
        }
        Update: {
          additional_attempts?: number
          assessment_id?: string
          assignment_id?: string
          classroom_id?: string
          consumed_at?: string | null
          consumed_attempt_id?: string | null
          created_at?: string
          ends_at?: string
          grant_type?: string
          id?: string
          instructor_id?: string
          reason?: string | null
          revoked_at?: string | null
          starts_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_student_access_grants_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_access_grants_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_access_grants_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_access_grants_consumed_attempt_id_fkey"
            columns: ["consumed_attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_access_grants_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_access_grants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          answered_count: number
          assessment_id: string
          assessment_version: number
          assignment_id: string | null
          attempt_number: number
          classroom_id: string | null
          correct_count: number
          created_at: string
          current_question_index: number
          expires_at: string | null
          exam_access_recorded_at: string | null
          exam_access_status: string | null
          exam_access_reference_number: string | null
          id: string
          last_activity_at: string | null
          locked_at: string | null
          maximum_score: number
          option_order: Json | null
          permit_number: string | null
          question_order: string[] | null
          session_id: string | null
          speed_bonus_total: number
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_attempt_status"]
          student_id: string
          submitted_at: string | null
          submitted_reason: string | null
          total_response_time_ms: number
          total_score: number
          unanswered_count: number
          updated_at: string
          wrong_count: number
        }
        Insert: {
          answered_count?: number
          assessment_id: string
          assessment_version: number
          assignment_id?: string | null
          attempt_number?: number
          classroom_id?: string | null
          correct_count?: number
          created_at?: string
          current_question_index?: number
          expires_at?: string | null
          exam_access_recorded_at?: string | null
          exam_access_status?: string | null
          exam_access_reference_number?: string | null
          id?: string
          last_activity_at?: string | null
          locked_at?: string | null
          maximum_score?: number
          option_order?: Json | null
          permit_number?: string | null
          question_order?: string[] | null
          session_id?: string | null
          speed_bonus_total?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_attempt_status"]
          student_id: string
          submitted_at?: string | null
          submitted_reason?: string | null
          total_response_time_ms?: number
          total_score?: number
          unanswered_count?: number
          updated_at?: string
          wrong_count?: number
        }
        Update: {
          answered_count?: number
          assessment_id?: string
          assessment_version?: number
          assignment_id?: string | null
          attempt_number?: number
          classroom_id?: string | null
          correct_count?: number
          created_at?: string
          current_question_index?: number
          expires_at?: string | null
          exam_access_recorded_at?: string | null
          exam_access_status?: string | null
          exam_access_reference_number?: string | null
          id?: string
          last_activity_at?: string | null
          locked_at?: string | null
          maximum_score?: number
          option_order?: Json | null
          permit_number?: string | null
          question_order?: string[] | null
          session_id?: string | null
          speed_bonus_total?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_attempt_status"]
          student_id?: string
          submitted_at?: string | null
          submitted_reason?: string | null
          total_response_time_ms?: number
          total_score?: number
          unanswered_count?: number
          updated_at?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_import_rows: {
        Row: {
          created_at: string
          id: string
          import_id: string
          is_excluded: boolean
          is_valid: boolean
          normalized_data: Json
          source_row_number: number
          updated_at: string
          validation_errors: Json
        }
        Insert: {
          created_at?: string
          id?: string
          import_id: string
          is_excluded?: boolean
          is_valid?: boolean
          normalized_data?: Json
          source_row_number: number
          updated_at?: string
          validation_errors?: Json
        }
        Update: {
          created_at?: string
          id?: string
          import_id?: string
          is_excluded?: boolean
          is_valid?: boolean
          normalized_data?: Json
          source_row_number?: number
          updated_at?: string
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "assessment_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_imports: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          file_size_bytes: number
          id: string
          imported_rows: number
          instructor_id: string
          invalid_rows: number
          original_filename: string
          status: Database["public"]["Enums"]["assessment_import_status"]
          total_rows: number
          updated_at: string
          valid_rows: number
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          file_size_bytes: number
          id?: string
          imported_rows?: number
          instructor_id: string
          invalid_rows?: number
          original_filename: string
          status?: Database["public"]["Enums"]["assessment_import_status"]
          total_rows?: number
          updated_at?: string
          valid_rows?: number
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          file_size_bytes?: number
          id?: string
          imported_rows?: number
          instructor_id?: string
          invalid_rows?: number
          original_filename?: string
          status?: Database["public"]["Enums"]["assessment_import_status"]
          total_rows?: number
          updated_at?: string
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_imports_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_imports_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_integrity_events: {
        Row: {
          assessment_id: string
          assignment_id: string
          attempt_id: string
          classroom_id: string
          client_occurred_at: string | null
          event_type: string
          id: string
          metadata: Json
          question_id: string | null
          question_index: number | null
          received_at: string
          severity: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          assignment_id: string
          attempt_id: string
          classroom_id: string
          client_occurred_at?: string | null
          event_type: string
          id: string
          metadata?: Json
          question_id?: string | null
          question_index?: number | null
          received_at?: string
          severity: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          assignment_id?: string
          attempt_id?: string
          classroom_id?: string
          client_occurred_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          question_id?: string | null
          question_index?: number | null
          received_at?: string
          severity?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_integrity_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_integrity_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_integrity_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_integrity_events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_integrity_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_integrity_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          allow_late_join: boolean
          assessment_id: string
          assessment_version: number
          cancelled_at: string | null
          classroom_id: string
          created_at: string
          ended_at: string | null
          id: string
          instructor_id: string
          session_code: string
          session_mode: Database["public"]["Enums"]["live_session_mode"]
          show_leaderboard: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_session_status"]
          updated_at: string
        }
        Insert: {
          allow_late_join?: boolean
          assessment_id: string
          assessment_version: number
          cancelled_at?: string | null
          classroom_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          instructor_id: string
          session_code: string
          session_mode?: Database["public"]["Enums"]["live_session_mode"]
          show_leaderboard?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_session_status"]
          updated_at?: string
        }
        Update: {
          allow_late_join?: boolean
          assessment_id?: string
          assessment_version?: number
          cancelled_at?: string | null
          classroom_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          instructor_id?: string
          session_code?: string
          session_mode?: Database["public"]["Enums"]["live_session_mode"]
          show_leaderboard?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          allow_backtracking: boolean
          archived_at: string | null
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          classroom_id: string | null
          created_at: string
          default_question_time_limit_seconds: number | null
          default_show_timer_progress: boolean
          id: string
          instructions: string | null
          instructor_id: string
          leaderboard_enabled: boolean
          overall_time_limit_seconds: number | null
          published_at: string | null
          question_count: number
          randomize_options: boolean
          randomize_questions: boolean
          require_exam_permit: boolean
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
          classroom_id?: string | null
          created_at?: string
          default_question_time_limit_seconds?: number | null
          default_show_timer_progress?: boolean
          id?: string
          instructions?: string | null
          instructor_id: string
          leaderboard_enabled?: boolean
          overall_time_limit_seconds?: number | null
          published_at?: string | null
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          require_exam_permit?: boolean
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
          classroom_id?: string | null
          created_at?: string
          default_question_time_limit_seconds?: number | null
          default_show_timer_progress?: boolean
          id?: string
          instructions?: string | null
          instructor_id?: string
          leaderboard_enabled?: boolean
          overall_time_limit_seconds?: number | null
          published_at?: string | null
          question_count?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          require_exam_permit?: boolean
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
            referencedRelation: "accounts"
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
      attempt_answer_options: {
        Row: {
          answer_id: string
          created_at: string
          option_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          option_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answer_options_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "attempt_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answer_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          awarded_points: number | null
          boolean_response: boolean | null
          created_at: string
          finalized_at: string | null
          id: string
          is_correct: boolean | null
          is_final: boolean
          question_id: string
          response_time_ms: number
          speed_bonus: number | null
          text_response: string | null
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          awarded_points?: number | null
          boolean_response?: boolean | null
          created_at?: string
          finalized_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_final?: boolean
          question_id: string
          response_time_ms?: number
          speed_bonus?: number | null
          text_response?: string | null
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          awarded_points?: number | null
          boolean_response?: boolean | null
          created_at?: string
          finalized_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_final?: boolean
          question_id?: string
          response_time_ms?: number
          speed_bonus?: number | null
          text_response?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_question_states: {
        Row: {
          attempt_id: string
          created_at: string
          deadline_at: string | null
          finalized_at: string | null
          first_delivered_at: string
          id: string
          order_number: number
          question_id: string
          timed_out_at: string | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          deadline_at?: string | null
          finalized_at?: string | null
          first_delivered_at: string
          id?: string
          order_number: number
          question_id: string
          timed_out_at?: string | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          deadline_at?: string | null
          finalized_at?: string | null
          first_delivered_at?: string
          id?: string
          order_number?: number
          question_id?: string
          timed_out_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_question_states_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_question_states_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
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
            referencedRelation: "accounts"
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
            referencedRelation: "accounts"
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
          join_requires_approval: boolean
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
          join_requires_approval?: boolean
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
          join_requires_approval?: boolean
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
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          employee_number: string
          first_name: string | null
          last_name: string | null
          middle_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          employee_number: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          employee_number?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          order_number: number
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          order_number: number
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          order_number?: number
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          accepted_answers: string[]
          assessment_id: string
          correct_boolean: boolean | null
          created_at: string
          explanation: string | null
          id: string
          image_url: string | null
          order_number: number
          points: number
          question_text: string
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          time_limit_seconds: number | null
          show_timer_progress: boolean
          updated_at: string
        }
        Insert: {
          accepted_answers?: string[]
          assessment_id: string
          correct_boolean?: boolean | null
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          order_number: number
          points?: number
          question_text: string
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          time_limit_seconds?: number | null
          show_timer_progress?: boolean
          updated_at?: string
        }
        Update: {
          accepted_answers?: string[]
          assessment_id?: string
          correct_boolean?: boolean | null
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          order_number?: number
          points?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["assessment_question_type"]
          time_limit_seconds?: number | null
          show_timer_progress?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          activated_at: string | null
          answered_count: number
          completed_at: string | null
          created_at: string
          current_question_number: number
          finished_at: string | null
          id: string
          joined_at: string
          last_activity_at: string | null
          left_at: string | null
          removed_at: string | null
          session_id: string
          status: Database["public"]["Enums"]["session_participant_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          answered_count?: number
          completed_at?: string | null
          created_at?: string
          current_question_number?: number
          finished_at?: string | null
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          left_at?: string | null
          removed_at?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["session_participant_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          answered_count?: number
          completed_at?: string | null
          created_at?: string
          current_question_number?: number
          finished_at?: string | null
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          left_at?: string | null
          removed_at?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["session_participant_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          middle_name: string | null
          student_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          student_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          student_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_assessment_safely: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: Json
      }
      assert_assessment_publishable: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: undefined
      }
      apply_assessment_question_timer_defaults: {
        Args: {
          p_assessment_id: string
          p_instructor_id: string
          p_show_timer_progress: boolean
          p_time_limit_seconds: number | null
        }
        Returns: number
      }
      begin_granted_assessment_attempt_with_access: {
        Args: {
          p_assignment_id: string
          p_exam_access_status?: string | null
          p_permit_number?: string | null
          p_student_id: string
        }
        Returns: string
      }
      begin_scheduled_assessment_attempt: {
        Args: { p_assignment_id: string; p_student_id: string }
        Returns: string
      }
      begin_scheduled_assessment_attempt_with_access_declaration: {
        Args: {
          p_assignment_id: string
          p_exam_access_status?: string | null
          p_permit_number?: string | null
          p_student_id: string
        }
        Returns: string
      }
      begin_student_attempt: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: string
      }
      grant_student_assessment_access: {
        Args: {
          p_assignment_id: string
          p_ends_at: string
          p_instructor_id: string
          p_reason?: string | null
          p_starts_at: string
          p_student_id: string
        }
        Returns: string
      }
      revoke_student_assessment_access_grant: {
        Args: { p_grant_id: string; p_instructor_id: string }
        Returns: undefined
      }
      close_assessment_session: {
        Args: {
          p_instructor_id: string
          p_session_id: string
          p_target_status: Database["public"]["Enums"]["assessment_session_status"]
        }
        Returns: undefined
      }
      close_live_assessment_session: {
        Args: {
          p_instructor_id: string
          p_session_id: string
          p_target_status: Database["public"]["Enums"]["assessment_session_status"]
        }
        Returns: undefined
      }
      close_scheduled_assessment_assignment: {
        Args: { p_assignment_id: string; p_instructor_id: string }
        Returns: undefined
      }
      edit_scheduled_assessment_assignment: {
        Args: {
          p_assignment_id: string
          p_ends_at: string
          p_instructor_id: string
          p_reason?: string | null
          p_starts_at: string
        }
        Returns: Json
      }
      extend_scheduled_assessment_assignment: {
        Args: {
          p_assignment_id: string
          p_instructor_id: string
          p_new_ends_at: string
          p_reason: string
        }
        Returns: Json
      }
      commit_assessment_import: {
        Args: {
          p_excluded_row_ids: string[]
          p_import_id: string
          p_instructor_id: string
        }
        Returns: number
      }
      complete_student_attempt: {
        Args: {
          p_attempt_id: string
          p_auto: boolean
          p_reason: string
          p_student_id: string
        }
        Returns: Json
      }
      create_assessment_session: {
        Args: {
          p_allow_late_join: boolean
          p_assessment_id: string
          p_instructor_id: string
        }
        Returns: string
      }
      create_assessment_with_assignments: {
        Args: {
          p_allow_backtracking: boolean
          p_assessment_type: Database["public"]["Enums"]["assessment_type"]
          p_classroom_ids: string[]
          p_instructions: string
          p_instructor_id: string
          p_leaderboard_enabled: boolean
          p_overall_time_limit_seconds: number
          p_randomize_options: boolean
          p_randomize_questions: boolean
          p_result_visibility: Database["public"]["Enums"]["assessment_result_visibility"]
          p_scoring_mode: Database["public"]["Enums"]["assessment_scoring_mode"]
          p_subject_code: string
          p_subject_name: string
          p_title: string
        }
        Returns: string
      }
      create_live_assessment_session: {
        Args: {
          p_allow_late_join: boolean
          p_assessment_id: string
          p_classroom_id: string
          p_instructor_id: string
          p_session_mode: Database["public"]["Enums"]["live_session_mode"]
          p_show_leaderboard: boolean
        }
        Returns: string
      }
      current_account_status: {
        Args: never
        Returns: Database["public"]["Enums"]["account_status"]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      delete_assessment_question: {
        Args: { p_instructor_id: string; p_question_id: string }
        Returns: string
      }
      delete_instructor_archived_assessment: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: Json
      }
      delete_instructor_closed_session: {
        Args: { p_instructor_id: string; p_session_id: string }
        Returns: Json
      }
      duplicate_assessment_question: {
        Args: { p_instructor_id: string; p_question_id: string }
        Returns: string
      }
      duplicate_assessment_with_questions: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: string
      }
      finalize_due_assessment_attempts: { Args: never; Returns: number }
      force_submit_scheduled_attempt: {
        Args: { p_attempt_id: string; p_instructor_id: string }
        Returns: Json
      }
      get_assessment_integrity_monitor: {
        Args: { p_assignment_id: string; p_attempt_ids: string[] }
        Returns: {
          attempt_id: string
          high_priority_count: number
          latest_event_type: string
          latest_signal_at: string
          low_priority_count: number
          medium_priority_count: number
          recent_events: Json
          signal_count: number
        }[]
      }
      get_classroom_enrollment_settings: {
        Args: { p_classroom_id: string }
        Returns: Json
      }
      grant_scheduled_attempt_extra_time: {
        Args: {
          p_attempt_id: string
          p_extra_seconds: number
          p_instructor_id: string
        }
        Returns: string
      }
      import_assessment_questions: {
        Args: {
          p_assessment_id: string
          p_instructor_id: string
          p_questions: Json
        }
        Returns: Json
      }
      join_assessment_session: {
        Args: { p_session_code: string; p_student_id: string }
        Returns: string
      }
      join_live_assessment_session: {
        Args: { p_session_code: string; p_student_id: string }
        Returns: string
      }
      leave_live_session_lobby: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: undefined
      }
      leave_session_lobby: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: undefined
      }
      prepare_attempt_question: {
        Args: {
          p_attempt_id: string
          p_requested_index: number
          p_student_id: string
        }
        Returns: Json
      }
      prepare_scheduled_attempt_question: {
        Args: {
          p_attempt_id: string
          p_requested_index: number
          p_student_id: string
        }
        Returns: Json
      }
      purge_assessment_integrity_events: {
        Args: { p_before: string }
        Returns: number
      }
      remove_live_session_participant: {
        Args: {
          p_instructor_id: string
          p_participant_id: string
          p_session_id: string
        }
        Returns: undefined
      }
      remove_session_participant: {
        Args: {
          p_instructor_id: string
          p_participant_id: string
          p_session_id: string
        }
        Returns: undefined
      }
      reorder_assessment_questions: {
        Args: {
          p_assessment_id: string
          p_instructor_id: string
          p_question_ids: string[]
        }
        Returns: undefined
      }
      resolve_auth_identifier: {
        Args: { p_identifier: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          email: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      return_assessment_to_draft_safely: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: Json
      }
      return_or_create_editable_assessment_draft: {
        Args: { p_assessment_id: string; p_instructor_id: string }
        Returns: Json
      }
      save_assessment_question:
        | {
            Args: {
              p_assessment_id: string
              p_explanation: string
              p_image_url: string
              p_instructor_id: string
              p_options: Json
              p_points: number
              p_question_id: string
              p_question_text: string
              p_question_type: Database["public"]["Enums"]["assessment_question_type"]
              p_time_limit_seconds: number
            }
            Returns: string
          }
        | {
            Args: {
              p_accepted_answers: string[]
              p_assessment_id: string
              p_correct_boolean: boolean
              p_explanation: string
              p_image_url: string
              p_instructor_id: string
              p_options: Json
              p_points: number
              p_question_id: string
              p_question_text: string
              p_question_type: Database["public"]["Enums"]["assessment_question_type"]
              p_time_limit_seconds: number
            }
            Returns: string
          }
      save_attempt_response:
        | {
            Args: {
              p_attempt_id: string
              p_finalize: boolean
              p_question_id: string
              p_selected_option_ids: string[]
              p_student_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_attempt_id: string
              p_boolean_response: boolean
              p_finalize: boolean
              p_question_id: string
              p_selected_option_ids: string[]
              p_student_id: string
              p_text_response: string
            }
            Returns: Json
          }
      save_scheduled_attempt_response:
        | {
            Args: {
              p_attempt_id: string
              p_finalize: boolean
              p_question_id: string
              p_selected_option_ids: string[]
              p_student_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_attempt_id: string
              p_boolean_response: boolean
              p_finalize: boolean
              p_question_id: string
              p_selected_option_ids: string[]
              p_student_id: string
              p_text_response: string
            }
            Returns: Json
          }
      reopen_scheduled_assessment_assignment: {
        Args: {
          p_assignment_id: string
          p_ends_at: string
          p_instructor_id: string
          p_reason?: string | null
          p_starts_at: string
        }
        Returns: Json
      }
      set_assessment_assignments: {
        Args: {
          p_assessment_id: string
          p_classroom_ids: string[]
          p_instructor_id: string
        }
        Returns: undefined
      }
      set_classroom_enrollment_approval: {
        Args: { p_classroom_id: string; p_required: boolean }
        Returns: Json
      }
      set_scheduled_assessment_assignments: {
        Args: {
          p_assessment_id: string
          p_instructor_id: string
          p_schedules: Json
        }
        Returns: undefined
      }
      start_assessment_session: {
        Args: { p_instructor_id: string; p_session_id: string }
        Returns: undefined
      }
      start_live_assessment_session: {
        Args: { p_instructor_id: string; p_session_id: string }
        Returns: undefined
      }
      submit_scheduled_assessment_attempt: {
        Args: {
          p_attempt_id: string
          p_auto: boolean
          p_reason: string
          p_student_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "rejected"
      assessment_attempt_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "locked"
        | "cancelled"
      assessment_import_status: "ready" | "committed" | "cancelled" | "failed"
      assessment_question_type:
        | "multiple_choice"
        | "checkbox"
        | "fill_blank"
        | "true_false"
        | "true_false_correction"
      assessment_result_visibility:
        | "hidden"
        | "score_only"
        | "score_and_answers"
      assessment_scoring_mode: "standard" | "speed_bonus"
      assessment_session_status: "lobby" | "active" | "ended" | "cancelled"
      assessment_status: "draft" | "published" | "archived"
      assessment_type: "quiz" | "examination" | "activity" | "practice"
      classroom_membership_status:
        | "pending"
        | "active"
        | "rejected"
        | "removed"
        | "left"
      classroom_status: "active" | "archived"
      live_session_mode: "student_paced" | "teacher_led"
      session_participant_status:
        | "waiting"
        | "active"
        | "completed"
        | "left"
        | "removed"
        | "finished"
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
      assessment_attempt_status: [
        "not_started",
        "in_progress",
        "submitted",
        "auto_submitted",
        "locked",
        "cancelled",
      ],
      assessment_import_status: ["ready", "committed", "cancelled", "failed"],
      assessment_question_type: [
        "multiple_choice",
        "checkbox",
        "fill_blank",
        "true_false",
        "true_false_correction",
      ],
      assessment_result_visibility: [
        "hidden",
        "score_only",
        "score_and_answers",
      ],
      assessment_scoring_mode: ["standard", "speed_bonus"],
      assessment_session_status: ["lobby", "active", "ended", "cancelled"],
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
      live_session_mode: ["student_paced", "teacher_led"],
      session_participant_status: [
        "waiting",
        "active",
        "completed",
        "left",
        "removed",
        "finished",
      ],
      user_role: ["admin", "instructor", "student"],
    },
  },
} as const
