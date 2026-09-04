export interface ReferenceItem {
    id: number;
    name: string;
}

// Ref: docs/lab-02/api-spec.md Section 2 GET /api/categories, Section 3 GET /api/related-systems

export async function fetchCategories(): Promise<ReferenceItem[]> {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error("Unable to load categories");
    const body = await res.json();
    return Array.isArray(body) ? body : (body.categories ?? body.data ?? []);
}

export async function fetchRelatedSystems(): Promise<ReferenceItem[]> {
    const res = await fetch("/api/related-systems");
    if (!res.ok) throw new Error("Unable to load related systems");
    const body = await res.json();
    return Array.isArray(body) ? body : (body.relatedSystems ?? body.data ?? []);
}