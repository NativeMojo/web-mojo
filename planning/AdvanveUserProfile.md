
In our portal app we have showProfile which shows a model form for a user profile.

[@PortalApp.js](file:///Users/ians/Projects/mojo/web-mojo/src/core/PortalApp.js) 

We want to add a nice rich UserProfileView to our [@core](file:///Users/ians/Projects/mojo/web-mojo/src/core/views/user/) and make sure it is exported, then update our PortalApp to use this.

I think this might need to be multiple views.

in the views onBeforeRender it should call `await this.model.fetch({params:{graph: 'full'}})` to get the latest user full data.

 - Overview
    - Ability to edit Display Name
    - Ability to change Avatar
    - Ability to change Timezone
    - Changing email or phone requires a complex flow that we will need to implement in the futre.
    - Ability to view permissions (NOT CHANGE)
    - show if email is not verified and add a button to verify
    - show if phone is not verified and add a button to verify
 - Need a user view that we can show at login to add a passkey.
 - Context Menu Items:
    - change password
    - update email
    - update phone
 - view my devices
 - view my sessions
 - Ability to add and manage passkeys
 - view my groups (memberships)


 Be creative and think of other common things in a user profile.
 
 Example user data:
 
 {
   "id": 1,
   "display_name": "Ian Starnes",
   "username": "ians",
   "email": "ian@mojoverify.com",
   "phone_number": null,
   "last_login": 1773513157,
   "last_activity": 1773546075,
   "permissions": {
     "view_jobs": true,
     "view_logs": true,
     "file_vault": true,
     "manage_aws": true,
     "view_admin": true,
     "view_users": true,
     "manage_jobs": true,
     "view_global": true,
     "view_groups": true,
     "manage_docit": true,
     "manage_files": true,
     "manage_users": true,
     "view_metrics": true,
     "view_tickets": true,
     "manage_groups": true,
     "export_reports": true,
     "manage_metrics": true,
     "manage_tickets": true,
     "view_analytics": true,
     "view_incidents": true,
     "admin_compliance": true,
     "manage_incidents": true,
     "manage_compliance": true,
     "view_all_operators": true,
     "manage_all_operators": true,
     "manage_notifications": true,
     "import_compliance_data": true,
     "manage_compliance_lists": true
   },
   "metadata": {

   },
   "is_active": true,
   "is_superuser": true,
   "is_email_verified": false,
   "is_phone_verified": false,
   "avatar": {
     "id": 44,
     "filename": "avatar.jpg",
     "content_type": "image/jpeg",
     "category": "image",
     "url": "https://mojo-verify.s3.amazonaws.com/signatures/14e7aab75c2749cb846f7d57298691ac/avatar_a6052d32.jpg",
     "thumbnail": "https://mojo-verify.s3.amazonaws.com/signatures/14e7aab75c2749cb846f7d57298691ac/avatar_a6052d32_renditions/thumbnail.jpg"
   },
   "org": null
 }



Come up with some clean KISS modern html mockups and put them in /planning/mockups/
