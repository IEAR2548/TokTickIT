// Ref: docs/lab-04/specification.md BR-16
// `appearsResolved` is a derived advisory flag: it resets to false whenever the Ticket is
// Reopened, or whenever the Requester edits the Ticket. These helpers make that side effect a
// named, independently testable transformation rather than an incidental line inside a route.

export interface AppearsResolvedTracked {
    appearsResolved: boolean;
}

/** Side-effect for the Reopen transition (Resolved/Closed -> Reopened). */
export function resetAppearsResolvedOnReopen<T extends AppearsResolvedTracked>(ticket: T): T {
    return { ...ticket, appearsResolved: false };
}

/** Side-effect for any Requester edit of their own Ticket. */
export function resetAppearsResolvedOnRequesterEdit<T extends AppearsResolvedTracked>(ticket: T): T {
    return { ...ticket, appearsResolved: false };
}
