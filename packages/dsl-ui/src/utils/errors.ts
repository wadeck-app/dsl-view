/** The text of a thrown value: the message of an Error, otherwise the value as text (something other than an Error can be thrown). */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
