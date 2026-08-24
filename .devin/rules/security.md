# Security: never read secrets or env files

NEVER read, `cat`, `grep`, or otherwise inspect `.env`, `.env.local`, `.env.*.local`, `.env.vercel`, or ANY file that may contain secrets/credentials — not even for troubleshooting, not even to check variable names.

Do not suggest commands that would print their contents. If the user mentions such a file, take their word for its contents. Diagnose env problems from symptoms, file timestamps, file sizes, and code only.

This rule has NO exceptions.

Note: this app stores secrets in WordPress wp-config.php, not in .env files. The main CFCE app stores secrets in the Vercel settings, and ignores .env files. 
