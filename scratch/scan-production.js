async function checkProduction() {
  console.log("Checking production URL: https://duo-pos.vercel.app/ ...");
  try {
    const resHtml = await fetch('https://duo-pos.vercel.app/');
    const html = await resHtml.text();
    
    // Find all JS asset scripts in index.html
    const assetRegex = /\/assets\/[a-zA-Z0-9_-]+\.js/g;
    const assetMatches = html.match(assetRegex);
    
    console.log('Found JS asset references:', assetMatches);
    
    if (assetMatches && assetMatches.length > 0) {
      // De-duplicate matches
      const uniqueAssets = [...new Set(assetMatches)];
      
      for (const assetPath of uniqueAssets) {
        const jsUrl = 'https://duo-pos.vercel.app' + assetPath;
        console.log(`\nFetching JS bundle: ${jsUrl} ...`);
        
        const resJs = await fetch(jsUrl);
        const js = await resJs.text();
        
        const hasOldKey = js.includes('sb_publishable_');
        const hasNewKey = js.includes('eyJhbGci');
        
        console.log(`- Contains old key (sb_publishable_):`, hasOldKey);
        console.log(`- Contains new key (JWT token):`, hasNewKey);
        
        const oldKeyMatch = js.match(/sb_publishable_[a-zA-Z0-9_-]+/g);
        if (oldKeyMatch) {
          console.log(`👉 Found OLD key in production:`, oldKeyMatch[0]);
        }
        
        const newKeyMatch = js.match(/eyJhbGciOi[a-zA-Z0-9_.-]+/g);
        if (newKeyMatch) {
          console.log(`👉 Found NEW key in production:`, newKeyMatch[0].substring(0, 30) + '...');
        }
      }
    } else {
      console.log('No JS assets found in index.html. HTML Length:', html.length);
      console.log('HTML Head Snippet:', html.substring(0, 1000));
    }
  } catch (err) {
    console.error('Error fetching production site:', err);
  }
}

checkProduction();
