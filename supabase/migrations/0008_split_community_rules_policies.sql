-- Keep public rule reads in the single public SELECT policy.
-- Split the authenticated write policy so it does not also create a second
-- permissive SELECT policy for signed-in users.
DROP POLICY IF EXISTS rules_write ON public.community_rules;

CREATE POLICY rules_insert
  ON public.community_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.community_role(community_id) = ANY (ARRAY['owner'::text, 'moderator'::text]))
    OR public.is_moderator()
  );

CREATE POLICY rules_update
  ON public.community_rules
  FOR UPDATE
  TO authenticated
  USING (
    (public.community_role(community_id) = ANY (ARRAY['owner'::text, 'moderator'::text]))
    OR public.is_moderator()
  )
  WITH CHECK (
    (public.community_role(community_id) = ANY (ARRAY['owner'::text, 'moderator'::text]))
    OR public.is_moderator()
  );

CREATE POLICY rules_delete
  ON public.community_rules
  FOR DELETE
  TO authenticated
  USING (
    (public.community_role(community_id) = ANY (ARRAY['owner'::text, 'moderator'::text]))
    OR public.is_moderator()
  );
