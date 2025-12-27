-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO MAKE A USER AN ADMIN

-- Replace 'superlychy@gmail.com' with the email address of the user you want to make an admin.
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'superlychy@gmail.com';

-- Alternatively, if you know the user's UUID:
-- UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';

-- Verify the change:
SELECT * FROM profiles WHERE role = 'admin';
