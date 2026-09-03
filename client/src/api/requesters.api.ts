export interface Requester {
    id: number;
    name: string;
    email: string;
}

export async function fetchActiveRequesters(): Promise<Requester[]> {
    const res = await fetch("/api/requesters");

    if (!res.ok) {
        throw new Error(`Failed to load requesters: ${res.status}`);
    }

    const data = await res.json();
    return data.requesters as Requester[];
}