const { createClient } = require('@supabase/supabase-js');

async function testRegister() {
  const url = 'https://adutmgqcavxsvvowvjuf.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdXRtZ3FjYXZ4c3Z2b3d2anVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjI2NjQsImV4cCI6MjA5NTI5ODY2NH0.-u3VwKjYqxTKCkRPVHm6hAZa7PslX3xlaOw0tGF21WQ';
  
  console.log("Testing real Supabase registration call...");
  const supabase = createClient(url, anonKey);
  
  const testEmail = `poeta-${Date.now()}@gmail.com`;
  const testPassword = `test-password-123`;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: `Poetica_${Date.now().toString().substring(8)}`,
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.error("❌ Supabase Auth signUp failed with error:", error);
    } else {
      console.log("✅ Supabase Auth signUp succeeded!");
      console.log("User details:", data.user);
      
      // Check if profile was created automatically
      console.log("Checking if profile exists in profiles table...");
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileErr) {
        console.error("❌ Failed to query profiles table:", profileErr);
      } else if (profile) {
        console.log("✅ Profile exists in profiles table!", profile);
      } else {
        console.log("⚠️ Profile row does not exist in profiles table (trigger did not run or failed).");
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

testRegister();
