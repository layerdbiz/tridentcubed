// What the database does by itself, after `schema.sql` has made the tables. The in-process database runs it once its
// tables are made (`index.ts`). drizzle-kit does not write triggers, so a shared database is given this same SQL by
// hand: trident-dev when it reached next (2026-11-26), production with the rest of next's database changes before it
// is promoted. Running it again changes nothing.
//
// The Activity's records (#306), each written whatever copy of the app did it, and never refusing what it records:
// one that cannot be written is warned about and left out.
// - A sign-out: a session ended before it ran out (Log Out, or taken away), not one that ran out by itself.
// - A sign-in code asked for: the address it went to (`sign-in-otp-` and the address is how Better Auth names it),
//   with its User and their organization when someone has signed in with it. Never the code.
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

CREATE OR REPLACE TRIGGER session_records_sign_in AFTER INSERT ON public.session
	FOR EACH ROW EXECUTE FUNCTION public.record_sign_in();

CREATE OR REPLACE FUNCTION public.record_sign_out() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
	IF OLD.expires_at > pg_catalog.now() THEN
		BEGIN
			INSERT INTO public.activity_event (kind, user_id, organization_id, user_agent)
			VALUES ('signOut', OLD.user_id, OLD.active_organization_id, NULLIF(OLD.user_agent, ''));
		EXCEPTION WHEN others THEN
			RAISE WARNING 'the sign-out could not be recorded for the Activity: %', SQLERRM;
		END;
	END IF;
	RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER session_records_sign_out AFTER DELETE ON public.session
	FOR EACH ROW EXECUTE FUNCTION public.record_sign_out();

CREATE OR REPLACE FUNCTION public.record_sign_in_code() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
	address text := pg_catalog.lower(pg_catalog.substr(NEW.identifier, 13));
	found_user uuid;
	found_organization uuid;
BEGIN
	BEGIN
		SELECT u.id INTO found_user FROM public."user" u WHERE pg_catalog.lower(u.email) = address LIMIT 1;
		SELECT m.organization_id INTO found_organization FROM public.member m
			WHERE m.user_id = found_user ORDER BY m.created_at LIMIT 1;
		INSERT INTO public.activity_event (kind, user_id, organization_id, email, created_at)
		VALUES ('code', found_user, found_organization, address, NEW.created_at);
	EXCEPTION WHEN others THEN
		RAISE WARNING 'the sign-in code could not be recorded for the Activity: %', SQLERRM;
	END;
	RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER verification_records_sign_in_code AFTER INSERT ON public.verification
	FOR EACH ROW WHEN (NEW.identifier LIKE 'sign-in-otp-%') EXECUTE FUNCTION public.record_sign_in_code();
`;
