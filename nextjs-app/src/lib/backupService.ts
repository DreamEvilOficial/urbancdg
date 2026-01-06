import simpleGit from 'simple-git';
import db from '@/lib/db';
import path from 'path';

// Initialize git client. 
// We assume the process runs in nextjs-app, so the repo root might be one level up or current dir.
// simple-git automatically searches up for the .git directory.
const git = simpleGit();

export async function runBackup() {
  console.log('[Backup] Starting backup check...');
  try {
    // Check if backup is enabled
    const row = await db.get('SELECT valor FROM configuracion WHERE clave = ?', ['autobackup_enabled']);
    
    let enabled = false;
    if (row) {
      try {
        const val = JSON.parse(row.valor);
        enabled = val === true || val === 'true';
      } catch {
        enabled = row.valor === 'true';
      }
    }

    if (!enabled) {
      console.log('[Backup] Autobackup is disabled in config.');
      return;
    }

    console.log('[Backup] Autobackup enabled. Proceeding with git operations...');
    
    // Status check
    const status = await git.status();
    if (status.isClean()) {
        console.log('[Backup] No changes to commit.');
        return;
    }

    // Add all files
    await git.add('.');
    
    // Commit
    const date = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    await git.commit(`Autobackup: ${date}`);
    
    // Push
    // Pushing to the default remote (usually origin) and currently checked out branch
    await git.push(); 
    
    console.log('[Backup] Backup completed successfully.');
    
  } catch (error) {
    console.error('[Backup] Backup failed:', error);
  }
}
