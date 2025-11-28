// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://imvitgswvzdsdikjvzem.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltdml0Z3N3dnpkc2Rpa2p2emVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDgsImV4cCI6MjA3MzA3NjE0OH0.TmHutfIHO4lDvOmbmsWvDLH26iocQM7-4uvcy1HD8Hs'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default supabase;
