// Menus own intentional unlocks; native Escape unlocks open the pause menu.
export class MenuMouseLock {
 constructor({isLocked,release,capture,enable,pause}){Object.assign(this,{isLocked,release,capture,enable,pause});this.locked=isLocked();this.menuOpen=false;this.restore=false;this.unlockExpected=false;}
 openMenu(){
  if(!this.menuOpen)this.restore=this.restore||this.locked||this.isLocked();
  this.menuOpen=true;this.unlockExpected=this.unlockExpected||this.isLocked();this.release();
 }
 closeMenu(){
  this.menuOpen=false;this.enable();const restore=this.restore;this.restore=false;if(restore)this.capture();
 }
 changed(){
  const locked=this.isLocked(),lost=this.locked&&!locked,expected=this.unlockExpected;this.locked=locked;
  if(!locked||!this.menuOpen)this.unlockExpected=false;
  // A delayed capture must not hide the cursor over a newly opened menu.
  if(locked&&this.menuOpen){this.unlockExpected=true;this.release();return;}
  if(lost&&!expected&&!this.menuOpen){this.restore=true;this.pause();}
 }
}
