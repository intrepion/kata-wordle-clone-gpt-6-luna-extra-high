module.exports=async function(page,id){
 const key=id.replace('kata-inspired-by-','');
 if(id.includes('filipino-mahjongg')){await page.getByRole('button',{name:'Play Round'}).click();await page.waitForTimeout(500)}
 else if(key.startsWith('california-games')){await page.getByRole('button',{name:/HALF-PIPE/}).first().click();await page.waitForTimeout(1000);const start=page.getByRole('button',{name:/start|ride|drop in/i});if(await start.count())await start.first().click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(1200);await page.keyboard.up('ArrowRight')}
 else if(key.startsWith('candy-crush')){await page.waitForTimeout(500)}
 else if(key.startsWith('factorio')){await page.keyboard.press('1');await page.waitForTimeout(500)}
 else if(key.startsWith('fibbage-3')){await page.getByRole('button',{name:/Start solo game/}).click();await page.locator('[data-category]').first().click();await page.locator('#bluff input').first().fill('Moon lantern');await page.locator('#bluff button[type=submit]').click();await page.locator('#vote').waitFor()}
 else if(key.startsWith('human-resource-machine')){await page.getByRole('button',{name:'+ INBOX'}).click();await page.getByRole('button',{name:'+ OUTBOX'}).click();await page.getByRole('button',{name:/Run/}).first().click();await page.waitForTimeout(700)}
 else if(key.startsWith('mario-paint')){const c=page.locator('canvas').first();const r=await c.boundingBox();if(!r)throw Error('paint canvas missing');await page.mouse.move(r.x+r.width*.35,r.y+r.height*.45);await page.mouse.down();await page.mouse.move(r.x+r.width*.65,r.y+r.height*.55,{steps:15});await page.mouse.up()}
 else if(key.startsWith('number-munchers')){await page.getByRole('button',{name:'Enter the orchard'}).click();await page.keyboard.press('Space');await page.waitForTimeout(400)}
 else if(key.startsWith('one-must-fall')){await page.getByRole('button',{name:/ENGAGE SYSTEMS/}).click();await page.waitForTimeout(1200);await page.keyboard.down('d');await page.keyboard.down('j');await page.waitForTimeout(1000);await page.keyboard.up('j');await page.keyboard.up('d')}
 else if(key.startsWith('order-of-the-sinking-star')){await page.keyboard.press('ArrowRight');await page.waitForTimeout(300)}
 else if(key.startsWith('road-rash-2')){await page.getByRole('button',{name:/Start your engine/}).click();await page.keyboard.down('w');await page.waitForTimeout(2500);await page.keyboard.up('w')}
 else if(key.startsWith('slay-the-spire')){await page.getByRole('button',{name:/Broken Steps/}).click();await page.waitForTimeout(500)}
 else if(key.startsWith('super-mario-64')){await page.keyboard.down('w');await page.waitForTimeout(1000);await page.keyboard.up('w');await page.keyboard.press('Space')}
 else if(key.startsWith('the-sims-4')){await page.getByRole('button',{name:'Mira',exact:true}).first().click().catch(()=>{});await page.waitForTimeout(500)}
 else if(id.startsWith('kata-minecraft-clone')){await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w')}
 else if(id.startsWith('kata-portal-clone')){await page.getByRole('button',{name:'Begin Test Chamber'}).click();await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w')}
 else if(id.startsWith('kata-wordle-clone')){await page.keyboard.type('crane');await page.keyboard.press('Enter');await page.waitForTimeout(500)}
 else throw Error('No capture action for '+id);
};
