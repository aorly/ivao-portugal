# Admin operations

## Admin entry points

- Admin home: `/{locale}/admin`
- Airports: `/{locale}/admin/airports`
- FIRs: `/{locale}/admin/firs`
- AIRAC: `/{locale}/admin/airac`
- Pages: `/{locale}/admin/pages`
- Menus: `/{locale}/admin/menus`
- Staff: `/{locale}/admin/staff`
- Users: `/{locale}/admin/users`

## Airports

- Airports are managed in `/{locale}/admin/airports`.
- Featured airports can be pinned to the top of the public list.
- The detail page manages runways, charts, sceneries, SIDs/STARs, stands, and layout.
- IVAO sync is available to refresh an airport from IVAO data.

## AIRAC imports

- `/{locale}/admin/airac` supports Fix, VOR, NDB, airports, and frequency boundary uploads.
- Upload, preview, then confirm to apply data.
- Imports replace existing data for the selected FIR and type.

## Pages and categories

- Pages live under `/{locale}/admin/pages` and are grouped by categories.
- Categories define documentation hierarchy and routing.
- Changing a category path revalidates affected pages.

## Users and access

- Use `/{locale}/admin/users` to set user role and extra permissions.
- Use the quick access override form on `/{locale}/admin/staff` to update by VID.
- ADMIN users ignore permission checkboxes.

## Menus

- Menus live under `/{locale}/admin/menus`.
- Changes revalidate the public menus and home page.
