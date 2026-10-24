# Shared leaderboard setup

The game uses browser storage until Supabase is configured. Follow these steps to make the leaderboard shared by all visitors:

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. In the project SQL Editor, run the contents of [`supabase-schema.sql`](./supabase-schema.sql).
3. In Project Settings, open the API settings and copy the project URL and the public anon/publishable key. Never use or publish the `service_role` key.
4. Put those values in [`leaderboard-config.js`](./leaderboard-config.js):

   ```js
   window.LEADERBOARD_CONFIG = {
       supabaseUrl: "https://YOUR_PROJECT.supabase.co",
       supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
   };
   ```

5. Upload `leaderboard-config.js`, `supabase-schema.sql`, `game.js`, `index.html`, `stlye.css`, and the Pages workflow to the GitHub repository. The shared ranking is available after Pages finishes deploying.

The public key is intended for browser use. Row Level Security allows visitors to read and submit scores but does not allow direct deletion. To clear the shared leaderboard, enter the exact owner name `GIYOMI`, click the reset button, and confirm. There is no password: anyone who knows the reset endpoint can clear the shared scores. Re-run `supabase-schema.sql` in the Supabase SQL Editor to apply the password-free reset function; this also removes any stored admin password hash and updates the name limit to 35 characters. Never put an admin or `service_role` key in the game.

If the Supabase URL or public key is empty, scores continue to be stored only in the current browser, and the game labels this clearly.
