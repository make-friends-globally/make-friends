## Change type (Protocol-SPEC §5.2)

Pick one and use it as the PR title prefix:

- [ ] `[index] add <username>` — new member entry
- [ ] `[index] remove <username>` — voluntary removal
- [ ] `[denylist] add <username>` — abuse report (human-only)
- [ ] `[schema] v1.x` — schema evolution
- [ ] `[site]` — site changes
- [ ] `[docs]` — documentation

## Automated checks (must all pass, Protocol-SPEC §5.3)

- [ ] Profile exists at the referenced repo path and validates against profile.schema.json
- [ ] No denylist match
- [ ] No email/phone regex hits in profile content
- [ ] All external links are https-only

## Human checks

- [ ] Repo ownership plausibility: the referenced repo belongs to the GitHub account
- [ ] Obvious intent: the profile is a genuine self-introduction
