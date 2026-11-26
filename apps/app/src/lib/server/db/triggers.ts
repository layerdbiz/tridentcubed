// What the database does by itself, after `schema.sql` has made the tables: the in-process database runs it once
// its tables are made (`index.ts`), and trident-dev and production were given the same SQL (the PR and the project's
// "before promoting dev" list say when).
//
// A sign-in's record for the Activity (#306): every new session leaves one in `sign_in`, whatever copy of the app
// signed its User in. dev.app and next.app share one database, and a sign-in through a copy whose code did not record
// it showed in the Activity with no device (Justin, 2026-11-26). A sign-in is never refused for its record: one that
// cannot be written is warned about and left out.
export const TRIGGERS_SQL = `
CREATE OR REPLACE FUNCTION public.record_sign_in() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
	BEGIN
		INSERT INTO public.sign_in (user_id, organization_id, created_at, user_agent)
		VALUES (NEW.user_id, NEW.active_organization_id, NEW.created_at, NULLIF(NEW.user_agent, ''));
	EXCEPTION WHEN others THEN
		RAISE WARNING 'the sign-in could not be recorded for the Activity: %', SQLERRM;
	END;
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_records_sign_in ON public.session;
CREATE TRIGGER session_records_sign_in AFTER INSERT ON public.session
	FOR EACH ROW EXECUTE FUNCTION public.record_sign_in();
`;
