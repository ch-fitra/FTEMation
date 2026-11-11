export interface Totals {
    activities_count: number;
    employees_count: number;
    departments_count: number;
    total_fte: number;
    estimated_fte_saving: number;
    remaining_fte: number;
    levels: Record<string, number>;
    oversight_count: number;
    top_activities: {
        activity_id: string;
        activity_name: string;
        priority_score: number;
    }[];
}
export interface AnalysisActivity {
    activity_id: string;
    activity_name: string;
    employee_name: string;
    department: string;
    automation_level: string;
    group_name: string;
    group_id: string;
    fte: number;
    estimated_fte_saving: number;
    priority_score: number;
    reason: string;
    recommendation: string;
    factors: Record<string, string>;
    risk_level: string;
    effort_level: string;
    oversight_required: boolean;
    oversight_note: string;
}
export interface Entity extends Totals {
    employee_id?: string;
    employee_name?: string;
    department: string;
    summary: string;
    opportunities: string;
    oversight_note: string;
}
export interface Report {
    totals: Totals;
    activities: AnalysisActivity[];
    employees: Entity[];
    departments: Entity[];
    groups: (Totals & {
        group_id: string;
        name: string;
        departments: string[];
        members: string[];
    })[];
    priorities: string[];
    interpretation: string;
}
export interface AnalysisRun {
    id: number;
    status: string;
    summary_status: string;
    model_name: string;
    actual_model: string | null;
    progress: Record<string, number>;
    total: number;
    cache_hits: number;
    requests_count: number;
    input_tokens: number;
    output_tokens: number;
    error_message: string | null;
    can_retry: boolean;
    failures: { activity_id: string; message: string }[];
    report?: Report;
}
