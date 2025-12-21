-- Add policies for listening_materials table to allow management

-- 1. Drop existing policies if any (to be safe/clean)
DROP POLICY IF EXISTS "Authenticated can insert listening materials" ON listening_materials;
DROP POLICY IF EXISTS "Authenticated can update listening materials" ON listening_materials;
DROP POLICY IF EXISTS "Authenticated can delete listening materials" ON listening_materials;

-- 2. Create Policies for Authenticated Users (Admins)

-- Allow authenticated users to INSERT
CREATE POLICY "Authenticated can insert listening materials"
ON listening_materials FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- Allow authenticated users to UPDATE
CREATE POLICY "Authenticated can update listening materials"
ON listening_materials FOR UPDATE
USING ( auth.role() = 'authenticated' );

-- Allow authenticated users to DELETE
CREATE POLICY "Authenticated can delete listening materials"
ON listening_materials FOR DELETE
USING ( auth.role() = 'authenticated' );
