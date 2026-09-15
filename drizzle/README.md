# Migration safety

Migration `0002_plain_hammerhead.sql` is already published and drops the original `todos`
table before recreating it with user ownership. A later migration cannot recover those rows or
assign them to users safely.

Before upgrading a database whose migration history stops before `0002`, export and back up the
`todos` table. Do not run the normal migration chain against that database until the rows have a
reviewed user-mapping and reimport plan. Fresh databases and databases that already applied `0002`
need no special handling, but data previously lost by `0002` cannot be repaired automatically.
