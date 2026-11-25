// For the app's tests that draw a component (#57): a value made deeply reactive, as the app's own state holds it, so
// a component that changes it and reads it back sees the change, as it does in the app.
export function toState<T>(value: T): T {
	const state = $state(value);
	return state;
}
