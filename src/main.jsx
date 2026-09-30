import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import inventoryIconUrl from './assets/Inventory.svg';
import outletIconUrl from './assets/Outlet.svg';
import reportIconUrl from './assets/Report.svg';
import subUserIconUrl from './assets/SubUser.svg';
import historyIconUrl from './assets/History.svg';
import productIconUrl from './assets/Product.svg';
import barIconUrl from './assets/Bar.svg';
import stockRoomIconUrl from './assets/stock-room.svg';
// Icon on each outlet card (Outlets page). Replace src/assets/outlet-card.svg to change it.
import outletCardIconUrl from './assets/outlet-card.svg';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; window.__API = API;

// ── Auth token stored in memory only ────────────────────────────────────────
let _token = null;
function setToken(t) { _token = t; window.__TOKEN = t; }
function getToken() { return _token; }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const fmtINR = (n) => `₹ ${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
// Same rule as the server: within ±10 ML of the bottle size = full bottle
const FULL_BOTTLE_TOLERANCE_ML = 10;
const snapFullBottle = (ml, size) => {
  const v = Math.max(0, Number(ml || 0)), sz = Number(size || 0);
  return sz > 0 && Math.abs(sz - v) <= FULL_BOTTLE_TOLERANCE_ML ? sz : v;
};
// Variance colour: red = shortage (more poured than billed), blue = surplus
const varianceColor = (ml, size = 750) => {
  const tol = Math.max(30, Number(size || 750) * 0.05);
  if (ml == null) return 'rgba(255,255,255,.4)';
  return Math.abs(ml) <= tol ? '#7dff9d' : ml > 0 ? '#ff7043' : '#82cfff';
};
const fmtMl = (n) => n == null ? '—' : `${Math.round(Number(n)).toLocaleString('en-IN')} ML`;

// ── Icons ────────────────────────────────────────────────────────────────────
function BackIcon(){return <svg viewBox="0 0 64 64" className="backIcon" fill="none"><path d="M29 17 14 32l15 15" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 32h20c8 0 13 5 13 13v2" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 64 64" className="homeIcon" fill="none"><path d="M14 31 32 16l18 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 29v22h24V29" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M27 51V39h10v12" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></svg>}
function LogoutIcon(){return <svg viewBox="0 0 64 64" className="logoutIcon" fill="none"><path d="M29 16H17v32h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M35 23l9 9-9 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 32h22" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>}
function SearchIcon(){return <svg viewBox="0 0 64 64" className="searchIcon" fill="none"><circle cx="27" cy="27" r="14" stroke="currentColor" strokeWidth="4"/><path d="M38 38 51 51" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>}
function FilterIcon(){return <svg viewBox="0 0 64 64" className="filterIcon" fill="none"><path d="M14 17h36L36 33v13l-8 4V33L14 17Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function OutletIcon({className='outletSvg'}){return <svg viewBox="0 0 90 90" className={className} fill="none"><path d="M20 40h50v34H20V40Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/><path d="M16 39h58l-5-19H21l-5 19Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/><path d="M24 20v19M34 20v19M44 20v19M54 20v19M64 20v19" stroke="currentColor" strokeWidth="2.5"/><path d="M28 73V52h15v21M50 54h13v11H50V54Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>}
function BarIcon({className='outletSvg'}){return <img src={barIconUrl} className={className} alt="" aria-hidden="true"/>}
function StockRoomIcon({className='outletSvg'}){return <img src={stockRoomIconUrl} className={className} alt="" aria-hidden="true"/>}
function ProductsIcon({className='dashIcon'}){return <svg viewBox="0 0 80 80" className={className} fill="none"><rect x="33" y="10" width="14" height="7" rx="3" stroke="currentColor" strokeWidth="3.2"/><path d="M30 17h20M26 28c-2 3-4 7-4 12v22c0 4 3 7 7 7h18c4 0 7-3 7-7V40c0-5-2-9-4-12l-2-5H28l-2 5Z" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 44h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M30 54h20M30 62h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/></svg>}
function Bottle({tone='orange',className='bottleSvg'}){return <svg viewBox="0 0 50 78" className={`${className} ${tone}`}><rect x="20" y="4" width="10" height="13" rx="2" fill="currentColor" opacity=".95"/><path d="M18 17h14l4 9v39c0 5-3 8-8 8h-6c-5 0-8-3-8-8V26l4-9Z" fill="currentColor" opacity=".25"/><path d="M18 17h14l4 9v39c0 5-3 8-8 8h-6c-5 0-8-3-8-8V26l4-9Z" stroke="currentColor" strokeWidth="2.5"/><rect x="17" y="37" width="16" height="20" rx="2" fill="currentColor" opacity=".55"/></svg>}
function DashIcon({type}){ if(type==='products')return <img src={productIconUrl} className="dashIcon" alt="" aria-hidden="true"/>; if(type==='inventory')return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" className="dashIcon" fill="currentColor"><path d="M297.375 0.414062C295.59375 0.414062 293.847656 0.878906 292.304688 1.765625L5.910156 167.03125C2.699219 168.894531 0.753906 172.351562 0.835938 176.0625L0.835938 411.957031C0.820312 415.601562 2.753906 418.976562 5.910156 420.808594L210.457031 538.855469C211.914062 539.660156 213.546875 540.097656 215.210938 540.125C215.394531 540.136719 215.582031 540.144531 215.765625 540.144531C217.347656 540.097656 218.890625 539.683594 220.28125 538.933594C220.390625 538.910156 220.496094 538.882812 220.601562 538.851562L250.792969 521.429688L250.792969 261.789062L215.527344 282.132812L149.015625 243.746094L250.792969 185.011719L250.792969 173.257812L138.832031 237.878906L108.121094 220.15625L250.792969 137.832031L250.792969 126.019531L97.878906 214.25L31.386719 175.882812L297.375 22.332031L363.90625 60.738281L325.578125 82.859375L346.085938 82.859375L374.148438 66.667969L402.214844 82.859375L442.96875 82.859375L302.449219 1.765625C300.902344 0.878906 299.15625 0.414062 297.375 0.414062ZM271.617188 93.4375C265.984375 93.417969 261.40625 97.972656 261.394531 103.601562L261.394531 565.464844C261.417969 571.089844 265.992188 575.632812 271.617188 575.609375L604.933594 575.609375C610.535156 575.597656 615.074219 571.066406 615.097656 565.464844L615.097656 103.601562C615.085938 97.996094 610.542969 93.449219 604.933594 93.4375ZM281.761719 113.746094L351.457031 113.746094L351.457031 132.246094L304.695312 132.246094C301.867188 132.234375 299.574219 134.527344 299.582031 137.355469L299.582031 531.714844C299.574219 534.539062 301.867188 536.835938 304.695312 536.824219L571.796875 536.824219C574.625 536.835938 576.917969 534.539062 576.90625 531.714844L576.90625 137.355469C576.917969 134.527344 574.625 132.234375 571.796875 132.246094L525.035156 132.246094L525.035156 113.746094L594.710938 113.746094L594.710938 555.324219L281.761719 555.324219ZM371.824219 113.746094L504.648438 113.746094L504.648438 132.246094L371.824219 132.246094ZM309.804688 142.386719L351.457031 142.386719L351.457031 161.324219C351.46875 166.957031 356.046875 171.507812 361.679688 171.488281L514.8125 171.488281C520.445312 171.507812 525.023438 166.957031 525.035156 161.324219L525.035156 142.386719L566.746094 142.386719L566.746094 526.679688L309.804688 526.679688ZM371.824219 142.386719L504.648438 142.386719L504.648438 151.179688L371.824219 151.179688ZM21.144531 193.484375L87.753906 231.933594L87.753906 270.300781C87.734375 272.117188 88.679688 273.804688 90.242188 274.734375L131.214844 298.34375C134.601562 300.214844 138.757812 297.777344 138.773438 293.910156L138.773438 261.371094L205.382812 299.816406L205.382812 512.378906L21.144531 406.046875ZM411.621094 218.070312C410.710938 218.128906 409.875 218.414062 409.117188 218.925781L387.675781 233.683594L387.675781 230.183594C387.6875 227.355469 385.390625 225.058594 382.5625 225.070312L340.773438 225.070312C337.972656 225.09375 335.710938 227.378906 335.722656 230.183594L335.722656 271.910156C335.710938 274.714844 337.972656 277 340.773438 277.023438L382.5625 277.023438C385.390625 277.035156 387.6875 274.738281 387.675781 271.910156L387.675781 246.035156L414.90625 227.339844C415.175781 227.148438 415.429688 226.929688 415.660156 226.691406C415.890625 226.453125 416.09375 226.191406 416.273438 225.910156C416.453125 225.628906 416.605469 225.335938 416.726562 225.027344C416.847656 224.714844 416.9375 224.398438 416.996094 224.070312C417.054688 223.742188 417.082031 223.410156 417.074219 223.078125C417.070312 222.746094 417.03125 222.417969 416.960938 222.09375C416.890625 221.765625 416.789062 221.453125 416.660156 221.144531C416.527344 220.839844 416.367188 220.550781 416.175781 220.277344C415.796875 219.726562 415.324219 219.269531 414.765625 218.902344C414.203125 218.539062 413.59375 218.292969 412.9375 218.167969C412.503906 218.078125 412.066406 218.046875 411.621094 218.070312ZM345.886719 235.234375L377.453125 235.234375L377.453125 240.722656L365.359375 249.058594L357.839844 240.40625C357.621094 240.148438 357.378906 239.917969 357.113281 239.710938C356.851562 239.503906 356.566406 239.324219 356.265625 239.171875C355.964844 239.019531 355.652344 238.902344 355.328125 238.8125C355.003906 238.722656 354.675781 238.664062 354.339844 238.640625C354.003906 238.617188 353.667969 238.625 353.335938 238.667969C353 238.710938 352.671875 238.785156 352.355469 238.890625C352.035156 239 351.730469 239.136719 351.4375 239.304688C351.144531 239.472656 350.875 239.667969 350.621094 239.886719C350.367188 240.109375 350.136719 240.351562 349.933594 240.621094C349.726562 240.886719 349.550781 241.171875 349.402344 241.472656C349.253906 241.773438 349.136719 242.085938 349.046875 242.414062C348.960938 242.738281 348.90625 243.066406 348.886719 243.402344C348.867188 243.738281 348.878906 244.074219 348.921875 244.40625C348.96875 244.738281 349.042969 245.066406 349.152344 245.382812C349.265625 245.703125 349.402344 246.003906 349.574219 246.296875C349.742188 246.585938 349.941406 246.855469 350.164062 247.109375L360.703125 259.140625C361.117188 259.605469 361.597656 259.980469 362.144531 260.269531C362.695312 260.554688 363.277344 260.738281 363.890625 260.8125C364.507812 260.886719 365.117188 260.851562 365.71875 260.703125C366.320312 260.554688 366.875 260.308594 367.386719 259.957031L377.453125 253.054688L377.453125 266.800781L345.886719 266.800781ZM97.898438 237.78125L128.628906 255.523438L128.628906 285.058594L97.898438 267.355469ZM405.796875 240.863281L405.796875 261.230469L540.808594 261.230469L540.808594 240.863281ZM51.914062 288.816406C51.019531 288.816406 50.144531 289.050781 49.367188 289.492188C47.773438 290.394531 46.789062 292.082031 46.78125 293.910156L46.78125 388.347656C46.789062 390.175781 47.773438 391.863281 49.367188 392.761719L172.070312 463.589844C175.476562 465.59375 179.769531 463.125 179.746094 459.175781L179.746094 364.738281C179.75 362.902344 178.761719 361.207031 177.160156 360.300781L54.441406 289.492188C53.671875 289.050781 52.800781 288.820312 51.914062 288.816406ZM412.121094 298.761719C411.023438 298.738281 410.023438 299.035156 409.117188 299.65625L387.675781 314.394531L387.675781 310.914062C387.6875 308.085938 385.390625 305.792969 382.5625 305.804688L340.773438 305.804688C337.972656 305.824219 335.710938 308.109375 335.722656 310.914062L335.722656 352.644531C335.710938 355.449219 337.972656 357.734375 340.773438 357.757812L382.5625 357.757812C385.390625 357.765625 387.6875 355.472656 387.675781 352.644531L387.675781 326.6875L414.90625 307.992188C415.175781 307.800781 415.429688 307.585938 415.660156 307.34375C415.890625 307.105469 416.09375 306.84375 416.273438 306.5625C416.453125 306.285156 416.605469 305.988281 416.726562 305.679688C416.847656 305.371094 416.9375 305.050781 416.996094 304.722656C417.054688 304.394531 417.082031 304.066406 417.078125 303.734375C417.070312 303.398438 417.03125 303.070312 416.960938 302.746094C416.890625 302.421875 416.792969 302.105469 416.660156 301.800781C416.527344 301.496094 416.367188 301.203125 416.179688 300.929688C415.710938 300.265625 415.121094 299.746094 414.40625 299.363281C413.691406 298.980469 412.929688 298.78125 412.121094 298.761719ZM57.027344 302.761719L169.503906 367.679688L169.503906 450.324219L57.027344 385.402344ZM345.886719 315.949219L377.453125 315.949219L377.453125 321.417969L365.359375 329.730469L357.839844 321.078125C357.621094 320.824219 357.382812 320.589844 357.117188 320.382812C356.851562 320.171875 356.570312 319.992188 356.269531 319.839844C355.96875 319.6875 355.65625 319.566406 355.332031 319.476562C355.007812 319.386719 354.679688 319.328125 354.34375 319.304688C354.007812 319.277344 353.671875 319.285156 353.339844 319.328125C353.003906 319.371094 352.675781 319.445312 352.359375 319.550781C352.039062 319.65625 351.730469 319.792969 351.441406 319.960938C351.148438 320.125 350.875 320.320312 350.621094 320.542969C350.367188 320.761719 350.136719 321.007812 349.933594 321.273438C349.726562 321.539062 349.550781 321.824219 349.402344 322.125C349.253906 322.425781 349.136719 322.742188 349.046875 323.066406C348.960938 323.390625 348.90625 323.722656 348.886719 324.058594C348.867188 324.390625 348.878906 324.726562 348.921875 325.058594C348.96875 325.394531 349.042969 325.71875 349.152344 326.035156C349.265625 326.355469 349.402344 326.660156 349.574219 326.949219C349.742188 327.238281 349.941406 327.511719 350.164062 327.761719L360.703125 339.796875C361.117188 340.261719 361.59375 340.636719 362.144531 340.925781C362.691406 341.214844 363.273438 341.398438 363.886719 341.476562C364.503906 341.550781 365.113281 341.519531 365.714844 341.371094C366.316406 341.226562 366.875 340.980469 367.386719 340.628906L377.453125 333.707031L377.453125 347.53125L345.886719 347.53125ZM405.796875 321.597656L405.796875 341.964844L540.808594 341.964844L540.808594 321.597656ZM82.882812 341.484375C81.242188 341.667969 79.789062 342.628906 78.984375 344.070312C77.597656 346.496094 78.421875 349.582031 80.832031 350.992188L140.523438 385.402344C142.96875 386.855469 146.132812 386.023438 147.542969 383.554688C148.933594 381.128906 148.105469 378.042969 145.695312 376.632812L86.003906 342.140625C85.0625 341.59375 83.96875 341.363281 82.882812 341.484375ZM82.902344 364.597656C81.261719 364.765625 79.800781 365.710938 78.984375 367.144531C77.609375 369.5625 78.433594 372.636719 80.832031 374.046875L140.523438 408.535156C142.964844 409.992188 146.125 409.167969 147.542969 406.707031C149 404.261719 148.167969 401.097656 145.695312 399.683594L86.003906 365.292969C85.070312 364.738281 83.984375 364.492188 82.902344 364.597656ZM340.773438 386.535156C337.972656 386.558594 335.710938 388.84375 335.722656 391.648438L335.722656 433.359375C335.710938 436.160156 337.972656 438.445312 340.773438 438.46875L382.5625 438.46875C385.390625 438.480469 387.6875 436.183594 387.675781 433.359375L387.675781 391.648438C387.6875 388.820312 385.390625 386.527344 382.5625 386.535156ZM345.886719 396.679688L377.453125 396.679688L377.453125 428.246094L345.886719 428.246094ZM405.796875 402.308594L405.796875 422.695312L540.808594 422.695312L540.808594 402.308594Z"/></svg>; if(type==='outlet')return <OutletIcon className="dashIcon"/>; if(type==='report')return <svg viewBox="0 0 80 80" className="dashIcon" fill="none"><path d="M24 14h24l10 10v42H24V14Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M47 14v12h11" stroke="currentColor" strokeWidth="4"/><path d="M34 56V42M42 56V32M50 56V48" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>; if(type==='subuser')return <svg viewBox="0 0 80 80" className="dashIcon" fill="none"><circle cx="34" cy="28" r="10" stroke="currentColor" strokeWidth="4"/><path d="M17 62c4-13 12-19 17-19s13 6 17 19" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M58 29v18M49 38h18" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>; if(type==='history')return <svg viewBox="0 0 80 80" className="dashIcon" fill="none"><path d="M22 29a22 22 0 1 1-2 22" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M20 18v14h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M40 28v15l10 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>; return <svg viewBox="0 0 80 80" className="dashIcon" fill="none"><rect x="31" y="8" width="18" height="10" rx="4" stroke="currentColor" strokeWidth="3.5"/><path d="M29 18h22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/><path d="M24 30c-3 4-5 9-5 15v19c0 5 4 9 9 9h20c5 0 9-4 9-9V45c0-6-2-11-5-15l-3-7H27l-3 7Z" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 47h42" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><rect x="29" y="55" width="22" height="12" rx="3" stroke="currentColor" strokeWidth="3"/><path d="M40 55v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>; }
function DashboardIcon({type}){
  // POS has no bundled asset, so it is drawn inline at the same size as the rest
  if(type==='pos') return (
    <svg viewBox="0 0 64 64" className="dashIcon" fill="none" stroke="currentColor"
         strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="12" y="8" width="40" height="34" rx="4"/>
      <path d="M12 32h40"/>
      <circle cx="23" cy="20" r="2.6" fill="currentColor" stroke="none"/>
      <circle cx="32" cy="20" r="2.6" fill="currentColor" stroke="none"/>
      <circle cx="41" cy="20" r="2.6" fill="currentColor" stroke="none"/>
      <path d="M21 42v6h22v-6M16 54h32"/>
    </svg>
  );
  const icons={inventory:inventoryIconUrl,outlet:outletIconUrl,report:reportIconUrl,subuser:subUserIconUrl,history:historyIconUrl,products:productIconUrl};
  return <img src={icons[type]||productIconUrl} className="dashIcon" alt="" aria-hidden="true"/>;
}
function Logo(){return <div className="logo"><b>SIROO</b></div>}
function SearchBar({value,onChange,text,disabled}){return <label className={`searchWrap ${disabled?'disabled':''}`}><SearchIcon/><input disabled={disabled} value={value||''} onChange={(e)=>onChange?.(e.target.value)} placeholder={text}/></label>}
function Select({label,value,onChange,options=[],disabled}){return <select className="selectBox" disabled={disabled} value={value||''} onChange={(e)=>onChange?.(e.target.value)}><option value="">{label}</option>{options.map(o=><option key={o.id||o._id||o} value={o.id||o._id||o}>{o.name||o}</option>)}</select>}
function Shell({setPage,children,className=''}){return <div className="page"><div className="pageContent"><div className="topLine"><button className="backButton" onClick={()=>setPage('__BACK__')}><BackIcon/>Back</button><button className="homeButton" onClick={()=>setPage('dashboard')} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><HomeIcon/></button></div><main className={`shell ${className}`}>{children}</main></div></div>}
function Toast({msg}){return msg?<div className="toast">{msg}</div>:null}

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const data = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Login failed'); return d; });
      setToken(data.token);
      onLogin(data.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page loginPage">
      <div className="pageContent loginContent">
        <div className="loginCard">
          <div className="loginLogo"><b>SIROO</b></div>
          <p className="loginSub">Alcohol Inventory Management</p>
          <form className="loginForm" onSubmit={handleLogin}>
            <label className="loginField">
              <span>Email Address</span>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@yourbar.com" required autoFocus/>
            </label>
            <label className="loginField">
              <span>Password</span>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
            </label>
            {err && <p className="loginErr">{err}</p>}
            <button className="loginBtn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="loginFooter">Access provided by SIROO. Contact admin to get your credentials.</p>
        </div>
      </div>
    </div>
  );
}

// ── Subscription Expired Screen ──────────────────────────────────────────────
function SubscriptionExpired({ onLogout }) {
  return (
    <div className="page loginPage">
      <div className="pageContent loginContent">
        <div className="loginCard">
          <div className="loginLogo"><b>SIROO</b></div>
          <p className="loginSub" style={{color:'#ff6b35'}}>Subscription Expired</p>
          <p style={{color:'#ffc181',textAlign:'center',lineHeight:1.7,margin:'18px 0 28px'}}>
            Your SIROO subscription has expired.<br/>
            Please contact SIROO support to renew your plan and regain access.
          </p>
          <button className="loginBtn" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App Pages (unchanged) ───────────────────────────────────────────────
function Dashboard({setPage, user, access, alerts, onDismissAlert, posLive}){
  const items=[
    ['Inventory','inventory','inventory','inventory'],
    ['Outlet','outlet','outlet','outlets'],
    // Always on the grid so the layout never shifts; it simply sits inert
    // until a POS connection starts pushing bills.
    ['POS','posstock','pos','pos'],
    ['Report','report','report','reports'],
    ['History','history','history','history'],
    ['Products','products','products','products'],
  ].filter(([,,,section]) => access.can(section));

  const role = user?.designation || (access.isSubUser ? 'Staff' : 'Owner');

  return (
    <div className="page dashboard">
      <header>
        <div className="profile">
          <b className="profileBrand">{user?.brandName||'SIROO'}</b>
          <span className="profileOwner">{user?.ownerName||'Owner'}</span>
          <span className="profileRole">{role}</span>
        </div>
        <Logo/>
        <button className="logout" onClick={()=>{ setToken(null); window.location.reload(); }}><LogoutIcon/>Logout</button>
      </header>

      {alerts?.length>0 && (
        <section className="alertPanel">
          <div className="alertPanelHead">
            <b>⚠ Par Stock Alerts</b>
            <span>{alerts.length} item{alerts.length===1?'':'s'} at or below par</span>
          </div>
          <div className="alertList">
            {alerts.map(a=>(
              <div key={a._id} className={`alertRow ${a.severity}`}>
                <div className="alertMain">
                  <b>{a.productName}</b>
                  <span>{a.outletName} · {a.locationName}</span>
                </div>
                <div className="alertQty">
                  <b>{a.currentBottles}</b>
                  <span>of {a.minBottles} min</span>
                </div>
                <span className={`alertTag ${a.severity}`}>{a.severity==='out'?'OUT OF STOCK':`SHORT BY ${a.shortBy}`}</span>
                <button className="alertDismiss" title="Ignore until stock is topped up"
                        onClick={()=>onDismissAlert(a._id)}>✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <main className="dashGrid">
        {items.map(([label,page,type])=>{
          const off = page==='posstock' && !posLive;
          return (
            <button key={label}
              className={`dashCard ${off?'dashCardOff':''}`}
              disabled={off}
              tabIndex={off?-1:0}
              aria-disabled={off||undefined}
              onClick={off?undefined:()=>setPage(page)}>
              <DashboardIcon type={type}/><span>{label}</span>
            </button>
          );
        })}
      </main>
    </div>
  );
}
function OutletPage({setPage,outlets,setOutlet}){return <Shell setPage={setPage} className="outletShell"><h1>Outlets</h1><p className="sub">Select your outlet</p><div className="outletCards">{outlets.map(x=><button className="outletCard" key={x._id||x.id} onClick={()=>{setOutlet(x);setPage('barselect')}}><img src={outletCardIconUrl} className="outletSvg" alt="" aria-hidden="true"/><b>{x.name}</b></button>)}</div></Shell>}
function BarSelect({setPage,selectedOutlet,setLocation}){return <Shell setPage={setPage} className="outletShell"><h1>{selectedOutlet?.name||'Select Outlet'}</h1><p className="sub">Select Stock Room or Bar</p><div className="barCards">{(selectedOutlet?.bars||[]).map(x=><button className="outletCard" key={x._id||x.id} onClick={()=>{setLocation(x);setPage('stock')}}>{x.type==='stockroom'?<StockRoomIcon/>:<BarIcon/>}<b>{x.name}</b></button>)}</div></Shell>}
function StockPage({setPage,ctx,stock,stockSearch,setStockSearch,refreshStock}){
  const isStock  = ctx.location?.type==='stockroom';
  const filtered = stock.filter(x=>`${x.name} ${x.category}`.toLowerCase().includes(stockSearch.toLowerCase()));
  const [menu,setMenu] = useState(null);
  const [par,setPar]   = useState(null);
  const [parLevels,setParLevels] = useState([]);

  const outletId   = ctx.outlet?._id?.toString()||ctx.outlet?.id;
  const locationId = ctx.location?._id?.toString()||ctx.location?.id;

  async function loadPars(){
    if(!outletId||!locationId) return;
    try{ setParLevels(await api(`/par-stock?outletId=${outletId}&locationId=${locationId}`)); }catch{}
  }
  useEffect(()=>{ loadPars(); },[outletId,locationId]);
  const parFor = pid => parLevels.find(p=>String(p.productId)===String(pid));
  const [edit,setEdit] = useState(null);
  const [msg, setMsg]  = useState('');

  // Close the row menu when clicking anywhere else
  useEffect(()=>{
    if(!menu) return;
    const h = () => setMenu(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  },[menu]);

  return <Shell setPage={setPage}>
    <div className="header stockHeader">
      <div><h1>{ctx.location?.name}</h1><p>{ctx.outlet?.name} / {ctx.location?.name}</p></div>
      <div className="actions stockActions">
        {isStock&&<>
          <button onClick={()=>setPage('addStock')}>Add Stock</button>
          <button onClick={()=>setPage('assign')}>Assign</button>
          <button className="pbStockBtn" onClick={()=>setPage('prebatch')}>⚗ Pre-Batch</button>
          <button className="kegStockBtn" onClick={()=>setPage('keg')}>🍺 Draft Keg</button>
        </>}
        {!isStock&&<>
          <button onClick={()=>setPage('inventory')}>Inventory</button>
          <button onClick={()=>setPage('transfer')}>Transfer</button>
          <button className="pbStockBtn" onClick={()=>setPage('prebatchbar')}>⚗ Pre-Batch</button>
          <button className="kegStockBtn" onClick={()=>setPage('kegbar')}>🍺 Draft Keg</button>
        </>}
      </div>
    </div>

    <SearchBar value={stockSearch} onChange={setStockSearch} text="Search for bottles, category or brand"/>
    {msg&&<p className="inlineMsg">{msg}</p>}

    <section className="table stockTable">
      <div className="thead">
        <span>Brand / Bottle</span><span>Category</span><span>Bottle Size</span><span>Cost</span>
        <span>Full Bottles</span><span>Open ML</span><span>Stock Value</span><span>•••</span>
      </div>
      {filtered.map(x=>{
        const rid = x.productId?.toString();
        const pl = parFor(x.productId);
        const low = pl && x.fullBottles < pl.minBottles;
        return <div className={`trow full ${low?'belowPar':''}`} key={rid}>
          <span>{x.name}</span><span>{x.category}</span><span>{x.bottleSizeMl} ML</span>
          <span>{fmtINR(x.cost)}</span><span>{x.fullBottles}</span><span>{x.openMl}</span>
          <span>{fmtINR(x.stockValue)}</span>
          <span className="dotWrap">
            <button onClick={(e)=>{e.stopPropagation();setMenu(menu===rid?null:rid);}}>•••</button>
            {menu===rid&&<div className="dotMenu" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setEdit({...x});setMenu(null);setMsg('');}}>Edit Inventory</button>
              <button onClick={()=>{setPar({...x});setMenu(null);setMsg('');}}>Set Par Alert</button>
            </div>}
          </span>
        </div>;
      })}
      {filtered.length===0&&<p className="noData">No stock in this location yet.</p>}
    </section>

    {par && <ParStockModal item={par} outletId={outletId} locationId={locationId}
      locationName={ctx.location?.name} existing={parFor(par.productId)}
      onClose={()=>setPar(null)}
      onSaved={()=>{ setPar(null); loadPars(); }}
      setMsg={setMsg}/>}

    {edit&&<EditStockModal
      line={edit} ctx={ctx}
      onClose={()=>setEdit(null)}
      onSaved={(m)=>{setEdit(null);setMsg(m);refreshStock?.();}}
    />}
  </Shell>;
}

// ── Edit Inventory Modal (Stock Room / Bar) ──────────────────────────────────
function EditStockModal({ line, ctx, onClose, onSaved }){
  const [full,   setFull]   = useState(String(line.fullBottles ?? 0));
  const [openMl, setOpenMl] = useState(String(Math.round(line.openMl ?? 0)));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const size    = Number(line.bottleSizeMl || 1);
  const perMl   = Number(line.cost || 0) / size;
  const newVal  = (Number(full||0) * size + Number(openMl||0)) * perMl;
  const changed = Number(full||0) !== Number(line.fullBottles||0)
               || Number(openMl||0) !== Math.round(Number(line.openMl||0));

  async function save(){
    setErr('');
    if(full===''||Number(full)<0)     return setErr('Full bottles must be zero or more');
    if(openMl===''||Number(openMl)<0) return setErr('Open ML must be zero or more');
    if(Number(openMl)>size)           return setErr(`Open ML cannot exceed the bottle size of ${size} ML`);
    if(!changed)                      return setErr('Nothing changed');
    if(!reason.trim())                return setErr('Enter a reason — this correction is recorded in the audit trail');
    setSaving(true);
    try{
      await api('/stock/adjust',{method:'POST',body:JSON.stringify({
        outletId:   ctx.outlet._id||ctx.outlet.id,
        locationId: ctx.location._id?.toString()||ctx.location.id,
        productId:  line.productId,
        fullBottles:Number(full),
        openMl:     Number(openMl),
        reason:     reason.trim(),
      })});
      onSaved(`${line.name} updated successfully`);
    }catch(e){ setErr(e.message); }
    setSaving(false);
  }

  return <div className="modal"><div className="addBottleModal" style={{maxWidth:480}}>
    <div className="addBottleModalHead"><h2>Edit Inventory</h2><button className="modalClose" onClick={onClose}>×</button></div>
    <p className="addBottleModalSub">{line.name} · {line.category} · {size} ML</p>
    <p style={{color:'rgba(255,193,129,.6)',fontSize:13,margin:'0 0 14px'}}>
      Currently <b style={{color:'#ffc181'}}>{line.fullBottles} full</b> and <b style={{color:'#ffc181'}}>{Math.round(line.openMl)} ML open</b> at {ctx.location?.name}.
    </p>
    {err&&<p className="inlineMsg" style={{color:'#ff7043'}}>{err}</p>}

    <div className="addBottlePriceGrid">
      <label className="addBottleField"><span>Full Bottles *</span>
        <input type="number" min="0" value={full} onChange={e=>setFull(e.target.value)} autoFocus/></label>
      <label className="addBottleField"><span>Open Bottle ML *</span>
        <input type="number" min="0" max={size} value={openMl} onChange={e=>setOpenMl(e.target.value)}/></label>
    </div>
    <label className="addBottleField" style={{marginTop:12}}><span>Reason for correction *</span>
      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Breakage, miscount, recount after audit"/></label>

    {changed&&<div className="emptyWtPreview" style={{marginTop:14}}>
      <span>New stock value</span>
      <b style={{fontSize:22}}>{fmtINR(newVal)}</b>
      <span style={{fontSize:12,opacity:.7}}>
        {line.fullBottles} → {Number(full||0)} full · {Math.round(line.openMl)} → {Number(openMl||0)} ML open
      </span>
    </div>}

    <div className="addBottleActions" style={{marginTop:18}}>
      <button className="addBottleSave" onClick={save} disabled={saving}>{saving?'Saving…':'Save Correction'}</button>
      <button className="addBottleCancel" onClick={onClose}>Cancel</button>
    </div>
  </div></div>;
}

function Inventory({setPage,outlets,products,recent,ctx,setOutlet,setLocation,refreshRecent,stock}){
  const [q,setQ]=useState('');const [product,setProduct]=useState(null);const [remaining,setRemaining]=useState(0);const [empty,setEmpty]=useState('');const [manualMl,setManualMl]=useState('');const [countMethod,setCountMethod]=useState('full');const [fullCount,setFullCount]=useState('');const [device,setDevice]=useState({connected:false,message:'Not connected'});const [err,setErr]=useState('');const [lastResult,setLastResult]=useState(null);
  // Pre-batch bottles are found by batch number (or bottle tag) in the same search box
  const [pbBottle,setPbBottle]=useState(null);const [pbMatches,setPbMatches]=useState([]);
  const [pbWeight,setPbWeight]=useState('');const [pbManualMl,setPbManualMl]=useState('');const [pbResult,setPbResult]=useState(null);
  const enabled=Boolean(ctx.outlet&&ctx.location); const locations=ctx.outlet?.bars||[]; const suggestions=enabled&&q&&!product&&!pbBottle?products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0,6):[]; const stockLine=product?stock.find(x=>(x.productId?.toString()===product._id?.toString()||x.productId?.toString()===product.id?.toString())):null; const openingFull=stockLine?.fullBottles??'-'; const openingOpen=stockLine?.openMl??'-';
  const [scannerSeen, setScannerSeen] = useState(false);
  const [scaleReading, setScaleReading] = useState(false);

  const outletKey = ctx.outlet?._id||ctx.outlet?.id||'';
  const locationKey = ctx.location?._id?.toString()||ctx.location?.id||'';
  async function findPbBottles(term){
    if(!outletKey||!locationKey||!term) return [];
    const p=new URLSearchParams({outletId:outletKey,locationId:locationKey,q:term});
    return api('/inventory/pb-bottles?'+p.toString()).catch(()=>[]);
  }
  // Search pre-batch bottles as the user types (batch number, tag or recipe)
  useEffect(()=>{
    if(!enabled||product||pbBottle||q.trim().length<2){ setPbMatches([]); return; }
    const t=setTimeout(async()=>{ setPbMatches((await findPbBottles(q.trim())).slice(0,6)); },300);
    return ()=>clearTimeout(t);
  },[q,outletKey,locationKey,product?._id,pbBottle?._id]);
  function clearPb(){ setPbBottle(null);setPbWeight('');setPbManualMl(''); }
  function choosePb(b){ setProduct(null);setPbBottle(b);setQ(b.batchNo);setPbMatches([]);setPbWeight('');setPbManualMl('');setPbResult(null);setErr(''); }

  // Poll scale status every 4s
  useEffect(()=>{
    function checkStatus(){ api('/scale/status').then(r=>setDevice(r)).catch(()=>setDevice({connected:false,message:'Bridge not reachable'})); }
    checkStatus();
    const t = setInterval(checkStatus, 4000);
    return ()=>clearInterval(t);
  },[]);

  // Auto-read scale as soon as product is selected (if scale connected)
  useEffect(()=>{
    setRemaining(0); setEmpty(''); setManualMl(''); setFullCount('');
    if(product && enabled && device.connected){ readScale(); }
  },[product?._id, product?.id]);

  // Pre-batch: the scale's raw weight is sent to the server, which works out the
  // remaining ML from the bottle's own tare and density (kept hidden)
  async function readScalePb(){
    if(!pbBottle||!enabled) return;
    if(!device.connected){ setErr('Scale not connected. Type the remaining ML instead.'); return; }
    setScaleReading(true); setErr('');
    try{
      const r = await api('/scale/read',{method:'POST',body:JSON.stringify({})});
      if(r.simulated || !r.connected || r.weightG===undefined){ setErr(r.message||'Scale not connected.'); }
      else setPbWeight(String(Math.round(Number(r.weightG))));
    }catch(e){ setErr('Scale error: '+e.message); }
    finally{ setScaleReading(false); }
  }
  useEffect(()=>{ if(pbBottle && enabled && device.connected) readScalePb(); },[pbBottle?._id]);
  async function savePb(){
    if(!pbBottle||!enabled) return;
    if(pbManualMl==='' && pbWeight==='') return setErr('Read the scale or type the remaining ML');
    setErr('');
    try{
      const r = await api(`/inventory/pb-bottles/${pbBottle._id}/count`,{method:'POST',body:JSON.stringify(
        pbManualMl!=='' ? { remainingMl:Number(pbManualMl) } : { grossWeightG:Number(pbWeight) })});
      setPbResult(r); setLastResult(null);
      clearPb(); setQ(''); setErr('Pre-batch bottle counted');
    }catch(e){ setErr(e.message); }
  }

  async function readScale(){
    if(!product||!enabled) return;
    if(!device.connected){ setErr('Scale not connected. Enter ML manually.'); return; }
    setScaleReading(true);
    setErr('');
    try{
      const r = await api('/scale/read',{method:'POST',body:JSON.stringify({
        productId:    product._id||product.id,
        bottleSizeMl: product.bottleSizeMl,
        emptyBottleWeightG: product.emptyBottleWeightG||0,
      })});
      if(r.simulated || !r.connected){
        setDevice(d=>({...d,connected:false}));
        setErr(r.message||'Scale not connected.');
      } else {
        setRemaining(Math.round(r.remainingMl||0));
        setErr('');
      }
    }catch(e){ setErr('Scale error: '+e.message); }
    finally{ setScaleReading(false); }
  }
  async function save(){
    if(!product||!enabled)return;
    setErr('');
    if(countMethod==='full' && fullCount==='') return setErr('Enter the remaining full bottle count');
    if(countMethod==='empty' && empty==='')    return setErr('Enter the empty bottle count');
    try{
      const saved = await api('/inventory/closing',{method:'POST',body:JSON.stringify({
        outletId:ctx.outlet._id||ctx.outlet.id,
        locationId:ctx.location._id?.toString()||ctx.location.id,
        productId:product._id||product.id,
        countMethod,
        emptyBottles:Number(empty||0),
        closingFullBottles: countMethod==='full' ? Number(fullCount||0) : undefined,
        remainingMl:snapFullBottle(manualMl!==''?manualMl:(remaining||0), product.bottleSizeMl),
      })});
      setLastResult(saved||null); setPbResult(null);
      setProduct(null);setQ('');setRemaining(0);setEmpty('');setManualMl('');setFullCount('');
      refreshRecent?.(); setErr('Inventory saved successfully');
    }catch(e){setErr(e.message)}
  }
  useHiddenBarcode((code)=>{
    setScannerSeen(true);
    if(!enabled)return;
    const found=products.find(p=>p.barcode===code);
    if(found){clearPb();setProduct(found);setQ(found.name);setRemaining(0);setFullCount('');setEmpty('');return;}
    // not a brand barcode — try it as a pre-batch batch number / bottle tag
    findPbBottles(code).then(list=>{ if(list.length===1) choosePb(list[0]); else if(list.length>1){ setQ(code); setPbMatches(list.slice(0,6)); } });
  });
  // Live preview — mirrors calculateConsumption() on the server for both count methods
  const size        = Number(product?.bottleSizeMl||1);
  const openFullN   = Number(stockLine?.fullBottles||0);
  const openOpenN   = Number(stockLine?.openMl||0);
  const rawClosingMl= Number(manualMl!==''?manualMl:(remaining||0));
  const closingMlN  = product ? snapFullBottle(rawClosingMl, size) : rawClosingMl;
  const snappedFull = Boolean(product) && closingMlN===size && rawClosingMl!==size && rawClosingMl>0;
  const hasCount    = countMethod==='full' ? fullCount!=='' : empty!=='';
  const closingFullN= countMethod==='full'
    ? Math.max(0,Number(fullCount||0))
    : Math.max(0,openFullN-Number(empty||0)-(closingMlN>0?1:0));
  const consumption = (product&&hasCount)
    ? Math.max(0,Math.round((openOpenN+openFullN*size)-(closingMlN+closingFullN*size)))
    : null;
  const totalSell   = consumption!==null&&product?fmtINR(consumption*(Number(product.cost||0)/size)):'₹ 0';
  const countError  = countMethod==='full'&&fullCount!==''&&Number(fullCount)>openFullN
    ? `Cannot exceed the opening count of ${openFullN}` : '';
  return (
    <div className="page">
      <div className="pageContent">
        <div className="topLine">
          <button className="backButton" onClick={()=>setPage('__BACK__')}><BackIcon/>Back</button>
          <button className="homeButton" onClick={()=>setPage('dashboard')} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><HomeIcon/></button>
        </div>
        <main className={`shell inv ${!enabled?'locked':''}`}>
          {/* Device Status — inside shell, no overlap */}
          <div className="deviceFloating">
            <span>Device Status</span>
            <div className="deviceRows">
              <div className="deviceRow"><span>Scale</span><b className={device.connected?'statusOn':'statusOff'}>{device.connected?'Connected':'Disconnected'}{device.error?<small title={device.error}> ⚠</small>:null}</b></div>
              <div className="deviceRow"><span>Barcode Scanner</span><b className={scannerSeen?'statusOn':'statusOff'}>{scannerSeen?'Active':'Waiting'}</b></div>
            </div>
            <ConnectScaleBtn device={device} onResult={(r)=>{setDevice(r); setErr(r.connected?'':(r.error||'Scale not found.'));}}/>
          </div>

          <section className="invTop">
            <div>
              <h1>Inventory</h1>
              <p>{ctx.outlet&&ctx.location?`${ctx.outlet.name} / ${ctx.location.name}`:'Select outlet and bar/stock room to take inventory.'}</p>
              <label>Brand Name</label>
              {product
                ? <div className="selectedBottle"><Bottle/><div><b>{product.name}</b><span>{product.category} • {product.bottleSizeMl} ML</span><small>Opening: {openingFull} full, {openingOpen} ML open</small></div><button onClick={()=>{setProduct(null);setQ('')}}>Change</button></div>
                : pbBottle
                ? <div className="selectedBottle"><Bottle/><div><b>{pbBottle.recipeName} <span className="pbInvTag">PRE-BATCH</span></b><span>Batch {pbBottle.batchNo} • Bottle {pbBottle.tag}</span><small>Last count: {(pbBottle.remainingMl??0).toLocaleString()} ML of {(pbBottle.filledMl??0).toLocaleString()} ML poured</small></div><button onClick={()=>{clearPb();setQ('')}}>Change</button></div>
                : <><SearchBar disabled={!enabled} value={q} onChange={(v)=>{setQ(v);setProduct(null)}} text="Search brand name or pre-batch batch number"/>
                    {(suggestions.length>0||pbMatches.length>0)&&<div className="suggestions">
                      {suggestions.map(p=><button key={p._id||p.id} onClick={()=>{clearPb();setProduct(p);setQ(p.name);setRemaining(0)}}>{p.name} • {p.category} • {p.bottleSizeMl} ML</button>)}
                      {pbMatches.map(b=><button key={b._id} onClick={()=>choosePb(b)}><span className="pbInvTag">PRE-BATCH</span> {b.batchNo} • {b.tag} • {b.recipeName} • {(b.remainingMl??0).toLocaleString()} ML</button>)}
                    </div>}
                    <p>Select or scan a product, or type a pre-batch batch number</p></>
              }
            </div>
            <div className="rightTop">
              <div className="selectRow">
                <Select label="Select Outlet" value={ctx.outlet?._id||ctx.outlet?.id||''} onChange={(id)=>setOutlet(outlets.find(o=>(o._id||o.id)===id)||null)} options={outlets.map(o=>({...o,id:o._id||o.id}))}/>
                <Select label="Select Bar / Stock Room" value={ctx.location?._id?.toString()||ctx.location?.id||''} onChange={(id)=>setLocation(locations.find(b=>(b._id?.toString()||b.id)===id)||null)} options={locations.map(b=>({...b,id:b._id?.toString()||b.id}))} disabled={!ctx.outlet}/>
              </div>
              <div className="remain">
                <span>Remaining ML</span>
                {pbBottle
                  ? <b>{scaleReading?'Reading...':(pbWeight!==''?`${Number(pbWeight).toLocaleString()} g`:'—')}</b>
                  : <b>{scaleReading?'Reading...':(product?`${remaining} ML`:'0 ML')}</b>}
                {pbBottle&&<small style={{color:'rgba(255,193,129,.7)'}}>Scale weight — ML is worked out on save</small>}
                {product&&!scaleReading&&remaining>0&&remaining===Number(product.bottleSizeMl)&&<small style={{color:'#7dff9d'}}>Full bottle</small>}
                <button disabled={(!product&&!pbBottle)||!enabled||scaleReading} onClick={pbBottle?readScalePb:readScale}>{scaleReading?'Reading...':'Read Again'}</button>
              </div>
            </div>
          </section>

          {pbBottle ? (
          <div className="metrics">
            <div className="metricBox"><span>Poured Into Bottle</span><b>{(pbBottle.filledMl??0).toLocaleString()} ML</b></div>
            <div className="metricBox"><span>Last Counted</span><b>{(pbBottle.remainingMl??0).toLocaleString()} ML</b></div>
            <div className="metricBox"><span>Location</span><b style={{fontSize:22}}>{pbBottle.locationName||ctx.location?.name||'—'}</b></div>
            <label className="metricBox inputMetric"><span>Scale Weight (g)</span><input disabled={!enabled} value={pbWeight} onChange={e=>{setPbWeight(e.target.value);}} placeholder="Read the scale or type the weight"/></label>
            <label className="metricBox inputMetric"><span>Or Type Remaining ML</span><input disabled={!enabled} value={pbManualMl} onChange={e=>setPbManualMl(e.target.value)} placeholder="Leave blank to use the weight"/></label>
            <div className="metricBox"><span>Count Uses</span><b style={{fontSize:22}}>{pbManualMl!==''?'Typed ML':pbWeight!==''?'Scale weight':'—'}</b></div>
          </div>
          ) : (
          <div className="metrics">
            <div className="metricBox"><span>Opening Full Bottles</span><b>{product?openingFull:'-'}</b></div>
            <div className="metricBox"><span>Opening Open Bottle ML</span><b>{product?openingOpen:'-'}</b></div>
            <label className={`metricBox inputMetric ${countError?'metricError':''}`}>
              {/* The heading itself is the selector — no extra field is added */}
              <select className="metricHeadSelect" disabled={!product||!enabled} value={countMethod}
                      onChange={e=>{setCountMethod(e.target.value);setEmpty('');setFullCount('');}}>
                <option value="empty">Empty Bottles</option>
                <option value="full">Full Bottles Remaining</option>
              </select>
              <input disabled={!product||!enabled}
                     value={countMethod==='full'?fullCount:empty}
                     onChange={e=>countMethod==='full'?setFullCount(e.target.value):setEmpty(e.target.value)}
                     placeholder={countMethod==='full'?'Type full bottles left':'Type empty bottles'}/>
              {countError&&<small className="metricErrText">{countError}</small>}
            </label>
            <label className="metricBox inputMetric"><span>One Open Bottle Remaining ML</span><input disabled={!product||!enabled} value={manualMl} onChange={e=>setManualMl(e.target.value)} placeholder="Type remaining ML"/>{snappedFull&&<small style={{display:'block',marginTop:6,color:'#7dff9d'}}>{rawClosingMl} ML is within {FULL_BOTTLE_TOLERANCE_ML} ML of {size} — counted as a full bottle ({size} ML)</small>}</label>
            <div className="metricBox"><span>Total Consumption</span><b>{consumption!==null?`${consumption} ML`:'-'}</b></div>
            <div className="metricBox"><span>Total Sell</span><b>{consumption!==null?totalSell:'₹ 0'}</b></div>
          </div>
          )}

          <div className="bottomActions">
            {pbBottle
              ? <button disabled={!enabled} onClick={savePb}>Save and Read Next</button>
              : <button disabled={!product||!enabled||Boolean(countError)} onClick={save}>Save and Read Next</button>}
            <button disabled={(!product&&!pbBottle)||!enabled} onClick={()=>{clearPb();setProduct(null);setQ('');setRemaining(0);setEmpty('');setManualMl('');setFullCount('')}}>Discard</button>
          </div>
          {err&&<p className="inlineMsg">{err}</p>}
          {lastResult&&lastResult.posComparedAt&&(
            <div className="posResult">
              <b>{lastResult.productName} — last count vs POS</b>
              <div className="posResultGrid">
                <div><span>Physically consumed</span><b>{fmtMl(lastResult.consumedMl)}</b></div>
                <div><span>POS sold</span><b>{fmtMl(lastResult.posSoldMl)}</b><small>{lastResult.posSoldQty||0} serve(s) · {lastResult.posBills||0} bill line(s)</small></div>
                <div><span>NC</span><b>{fmtMl(lastResult.ncMl)}</b><small>{lastResult.ncQty||0} serve(s)</small></div>
                <div><span>Variance</span><b style={{color:varianceColor(lastResult.varianceMl,lastResult.bottleSizeMl)}}>{fmtMl(lastResult.varianceMl)}</b><small>Consumed − POS sold − NC</small></div>
              </div>
              <small>Bills since {lastResult.posWindowFrom?new Date(lastResult.posWindowFrom).toLocaleString():'the previous count'}</small>
            </div>
          )}

          {pbResult&&(
            <div className="posResult">
              <b>{pbResult.recipeName} · Batch {pbResult.batchNo} · Bottle {pbResult.tag}{pbResult.posConnected?' — count vs POS':''}</b>
              <div className="posResultGrid">
                <div><span>Remaining now</span><b>{fmtMl(pbResult.remainingMl)}</b><small>was {fmtMl(pbResult.openingMl)}</small></div>
                <div><span>Physically consumed</span><b>{fmtMl(pbResult.consumedMl)}</b></div>
                {pbResult.posConnected ? <>
                  <div><span>POS sold</span><b>{fmtMl(pbResult.posSoldMl)}</b><small>{pbResult.posSoldQty||0} serve(s){pbResult.ncMl?` · NC ${fmtMl(pbResult.ncMl)}`:''}</small></div>
                  <div><span>Variance</span><b style={{color:varianceColor(pbResult.varianceMl,750)}}>{fmtMl(pbResult.varianceMl)}</b><small>Consumed − POS sold − NC</small></div>
                </> : <div style={{gridColumn:'span 2'}}><span>POS</span><b style={{fontSize:16}}>Not mapped at this bar</b><small>Map the recipe in POS settings to compare with bills</small></div>}
              </div>
              {pbResult.posConnected&&<small>Bills since {pbResult.posWindowFrom?new Date(pbResult.posWindowFrom).toLocaleString():'the previous count'} · with several open bottles of one recipe, count them together</small>}
            </div>
          )}

          <hr/>
          <h2>Recent Inventory</h2>
          <section className="recentTable">
            <div className="recentHead">
              <span>Brand</span><span>Op. Full</span><span>Op. Open ML</span>
              <span>Empty Btl</span><span>Cl. Open ML</span>
              <span>Consumption</span><span>Total Sell</span><span>Time</span>
            </div>
            {recent.map(r=>(
              <div className="recentRow" key={r._id||r.id}>
                <span>{r.productName||'-'}</span>
                <span>{r.openingFullBottles??'-'}</span>
                <span>{r.openingOpenMl??'-'}</span>
                <span>{r.emptyBottles??'-'}</span>
                <span>{r.remainingMl??'-'}</span>
                <span>{r.consumedMl!=null?r.consumedMl+' ML':'-'}</span>
                <span>{r.totalSell?fmtINR(r.totalSell):'₹ 0'}</span>
                <span>{new Date(r.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function ConnectScaleBtn({device, onResult}){
  const [scanning, setScanning] = React.useState(false);
  async function connect(){
    setScanning(true);
    try{
      const r = await fetch((window.__API||'http://localhost:5000/api')+'/scale/connect',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+(window.__TOKEN||'')}
      }).then(x=>x.json());
      onResult(r);
    }catch(e){ onResult({connected:false,error:'Scale bridge not reachable. Make sure siroo_scale_bridge.py is running.'}); }
    setScanning(false);
  }
  return <button onClick={connect} disabled={scanning} style={{opacity:scanning?0.7:1}}>
    {scanning?'Scanning... (up to 15s)':'Connect Scale'}
  </button>;
}

function useHiddenBarcode(onCode){ const buffer=useRef(''); const timer=useRef(null); useEffect(()=>{const h=(e)=>{ if(e.target?.tagName==='INPUT'||e.target?.tagName==='TEXTAREA')return; if(e.key==='Enter'){ const code=buffer.current.trim(); buffer.current=''; if(code.length>3)onCode(code); return;} if(e.key.length===1){ buffer.current+=e.key; clearTimeout(timer.current); timer.current=setTimeout(()=>{buffer.current=''},120); }}; window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h);},[onCode]);}

function Products({setPage,products,master,loadProducts,outlets,categories}){
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [masterQ,setMasterQ]=useState('');
  const [masterId,setMasterId]=useState('');
  const [selectedMaster,setSelectedMaster]=useState(null);
  const [cost,setCost]=useState('');
  const [fullBottleWeightG,setFullBottleWeightG]=useState('');
  const [selOutlets,setSelOutlets]=useState([]);
  const [allOutlets,setAllOutlets]=useState(false);
  const [edit,setEdit]=useState(null);
  const [editMsg,setEditMsg]=useState('');
  const [menu,setMenu]=useState(null);
  const [msg,setMsg]=useState('');
  const cats=[...new Set(products.map(p=>p.category))];
  const rows=products.filter(p=>(!q||`${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))&&(!cat||p.category===cat));
  const masterRows=master.filter(m=>`${m.name} ${m.category}`.toLowerCase().includes(masterQ.toLowerCase())&&!products.some(p=>p.masterBottleId?.toString()===m._id?.toString())).slice(0,8);
  // Load categories inside component in case parent array is empty
  const [localCats, setLocalCats] = useState([]);
  useEffect(()=>{
    if(categories && categories.length > 0){
      setLocalCats(categories);
    } else {
      api('/categories').then(setLocalCats).catch(()=>{});
    }
  }, [categories]);
  const activeCats = localCats.length > 0 ? localCats : categories;
  const catRatio = selectedMaster
    ? activeCats.find(c => c.name.toLowerCase() === (selectedMaster.category||'').toLowerCase())
    : null;
  const ratio = catRatio ? Number(catRatio.gramToMlRatio) : null;
  const previewEmpty = fullBottleWeightG && selectedMaster && ratio !== null
    ? Math.round(Number(fullBottleWeightG) - selectedMaster.bottleSizeMl * ratio)
    : null;
  function toggleOutlet(id){setSelOutlets(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);setAllOutlets(false);}
  function toggleAllOutlets(){setAllOutlets(v=>{if(!v)setSelOutlets([]);return !v;});}
  async function add(){
    setMsg('');
    if(!masterId)return setMsg('Search and select a bottle first');
    if(!Number(cost))return setMsg('Bottle price is compulsory');
    if(!fullBottleWeightG||Number(fullBottleWeightG)<=0)return setMsg('Full bottle weight is required');
    const outletIds=allOutlets?outlets.map(o=>o._id||o.id):selOutlets;
    if(outletIds.length===0&&!allOutlets)return setMsg('Select at least one outlet or choose All Outlets');
    if(ratio===null)return setMsg(`Category "${selectedMaster?.category}" not found in Spirit Categories. Please add it in Admin → Spirit Categories first.`);
    try{
      await api('/user-products',{method:'POST',body:JSON.stringify({masterBottleId:masterId,cost,fullBottleWeightG:Number(fullBottleWeightG),outletIds})});
      setShowAdd(false);setMasterId('');setMasterQ('');setCost('');setFullBottleWeightG('');setSelOutlets([]);setAllOutlets(false);setSelectedMaster(null);
      loadProducts();
    }catch(e){setMsg(e.message)}
  }
  async function saveEdit(){
    setEditMsg('');
    if(!Number(edit.cost)||Number(edit.cost)<=0) return setEditMsg('Bottle cost must be greater than zero');
    if(edit.fullBottleWeightG&&Number(edit.fullBottleWeightG)<=0) return setEditMsg('Full bottle weight must be greater than zero');
    if(false&&edit.emptyBottleWeightG&&edit.fullBottleWeightG&&Number(edit.emptyBottleWeightG)>=Number(edit.fullBottleWeightG))
      return setEditMsg('Empty bottle weight must be less than the full bottle weight');
    try{
      await api(`/user-products/${edit._id||edit.id}`,{method:'PUT',body:JSON.stringify({
        cost:              Number(edit.cost),
        active:            edit.active,
        bottleSizeMl:      Number(edit.bottleSizeMl)||undefined,
        fullBottleWeightG: edit.fullBottleWeightG===''?undefined:Number(edit.fullBottleWeightG),
      })});
      setEdit(null);setEditMsg('');loadProducts();
    }catch(e){setEditMsg(e.message)}
  }
  async function del(p){if(!confirm(`Delete ${p.name}?`))return; try{await api(`/user-products/${p._id||p.id}`,{method:'DELETE'});setMenu(null);loadProducts();}catch(e){setMsg(e.message)}}
  return <Shell setPage={setPage}>
    <div className="header"><div><h1>Products</h1><p>Manage all bottles, brands and product value in one place.</p></div><button className="addBtn" onClick={()=>setShowAdd(true)}>Add Brand / Bottle</button></div>
    <div className="toolbar productToolbar"><SearchBar value={q} onChange={setQ} text="Search by bottle, brand or category..."/><Select label="All Categories" value={cat} onChange={setCat} options={cats}/><button className="filterBtn" onClick={()=>setMsg(`Filter applied${cat?`: ${cat}`:''}`)}><FilterIcon/></button></div>
    {msg&&<p className="inlineMsg">{msg}</p>}
    {showAdd&&<div className="modal"><div className="addBottleModal">
      <div className="addBottleModalHead"><h2>Add Brand / Bottle</h2><button className="modalClose" onClick={()=>{setShowAdd(false);setMsg('')}}>×</button></div>
      <p className="addBottleModalSub">Search the admin bottle database, select a bottle, then enter your own price.</p>
      <div className="addBottleSearch"><label>Search Bottle</label>
        <SearchBar value={masterQ} onChange={(v)=>{setMasterQ(v);setMasterId('');setSelectedMaster(null);}} text="Search bottle from admin database"/>
        {masterQ&&<div className="modalList">{masterRows.length?masterRows.map(m=><button key={m._id||m.id} onClick={()=>{setMasterId(m._id||m.id);setMasterQ(`${m.name} • ${m.bottleSizeMl}ML`);setSelectedMaster(m);}} className={masterId===(m._id||m.id)?'selected':''}><div className="modalBottleRow"><Bottle tone="orange"/><div><b>{m.name}</b><small>{m.category} • {m.bottleSizeMl} ML • Barcode: {m.barcode}</small></div>{masterId===(m._id||m.id)&&<span className="checkmark">✓</span>}</div></button>):<span className="noResults">No available bottle found or already added</span>}</div>}
      </div>
      <div className="addBottlePriceGrid">
        <label className="addBottleField"><span>Your Bottle Cost <span style={{color:'#ff6b35'}}>*</span></span><input placeholder="Enter price (₹)" value={cost} onChange={e=>setCost(e.target.value)} type="number" min="1"/></label>
        <label className="addBottleField"><span>Full Bottle Weight (g) <span style={{color:'#ff6b35'}}>*</span></span><input placeholder="e.g. 1240" value={fullBottleWeightG} onChange={e=>setFullBottleWeightG(e.target.value)} type="number" min="1"/></label>
      </div>
      {selectedMaster && ratio === null && <p className="inlineMsg" style={{color:'#ff7043'}}>⚠ Category "{selectedMaster?.category}" not found in Spirit Categories. Please add it in Admin first.</p>}
      <div className="addBottleOutlets">
        <label>Add to Outlets <span style={{color:'#ff6b35'}}>*</span></label>
        <label className="outletCheckRow allOutletRow"><input type="checkbox" checked={allOutlets} onChange={toggleAllOutlets}/><span>All Outlets</span></label>
        <div className="outletCheckGrid">{outlets.map(o=>{const id=(o._id||o.id)?.toString();return(<label key={id} className={`outletCheckRow ${allOutlets?'dimmed':''}`}><input type="checkbox" checked={allOutlets||selOutlets.includes(id)} onChange={()=>toggleOutlet(id)} disabled={allOutlets}/><span>{o.name}</span></label>);})}</div>
      </div>
      {msg&&<p className="inlineMsg">{msg}</p>}
      <div className="addBottleActions">
        <button className="addBottleSave" disabled={!masterId||!Number(cost)||!Number(fullBottleWeightG)||ratio===null} onClick={add}>Save Product</button>
        <button className="addBottleCancel" onClick={()=>{setShowAdd(false);setMsg('');setMasterId('');setMasterQ('');setCost('');setFullBottleWeightG('');setSelOutlets([]);setAllOutlets(false);setSelectedMaster(null);}}>Cancel</button>
      </div>
    </div></div>}
    {edit&&(()=>{
      const eCat   = activeCats.find(c=>c.name.toLowerCase()===(edit.category||'').toLowerCase());
      const eRatio = eCat?Number(eCat.gramToMlRatio):null;
      const autoEmpty = (edit.fullBottleWeightG&&eRatio!==null)
        ? Math.round(Number(edit.fullBottleWeightG)-Number(edit.bottleSizeMl||0)*eRatio)
        : null;
      return <div className="modal"><div className="addBottleModal" style={{maxWidth:560}}>
        <div className="addBottleModalHead"><h2>Edit Bottle</h2><button className="modalClose" onClick={()=>{setEdit(null);setEditMsg('');}}>×</button></div>
        <p className="addBottleModalSub">{edit.name} · {edit.category} · {edit.bottleSizeMl} ML</p>
        {editMsg&&<p className="inlineMsg" style={{color:'#ff7043'}}>{editMsg}</p>}
        <div className="addBottlePriceGrid">
          <label className="addBottleField"><span>Bottle Cost (₹) <span style={{color:'#ff6b35'}}>*</span></span>
            <input type="number" min="1" value={edit.cost??''} onChange={e=>setEdit({...edit,cost:e.target.value})}/></label>
          <label className="addBottleField"><span>Bottle Size (ML)</span>
            <input type="number" min="1" value={edit.bottleSizeMl??''} onChange={e=>setEdit({...edit,bottleSizeMl:e.target.value})}/></label>
          <label className="addBottleField"><span>Full Bottle Weight (g)</span>
            <input type="number" min="1" placeholder="e.g. 1240" value={edit.fullBottleWeightG??''}
                   onChange={e=>setEdit({...edit,fullBottleWeightG:e.target.value})}/></label>
        </div>
        <ScmMapper product={edit} onMapped={p=>{setEdit({...edit,...p});loadProducts();}}/>
        {eRatio===null&&(
          <p className="inlineMsg" style={{color:'#ff7043',marginTop:12}}>
            ⚠ Category "{edit.category}" has no gram:ml ratio configured. Add it under Admin → Spirit Categories.
          </p>
        )}
        <label className="outletCheckRow" style={{marginTop:12}}>
          <input type="checkbox" checked={edit.active!==false} onChange={e=>setEdit({...edit,active:e.target.checked})}/>
          <span>Active</span>
        </label>
        <div className="addBottleActions" style={{marginTop:18}}>
          <button className="addBottleSave" onClick={saveEdit}>Save Changes</button>
          <button className="addBottleCancel" onClick={()=>{setEdit(null);setEditMsg('');}}>Cancel</button>
        </div>
      </div></div>;
    })()}
    <section className="productTable">
      <div className="prodHead"><span>Bottle / Brand</span><span>Category</span><span>Size</span><span>Cost</span><span>Status</span><span>•••</span></div>
      {rows.map(p=><div className="prodRow" key={p._id||p.id}>
        <div><span className="bottleThumb"><Bottle/></span><b>{p.name}</b><small>{p.bottleSizeMl} ML</small></div>
        <span>{p.category}</span><span>{p.bottleSizeMl}</span><span>{fmtINR(p.cost)}</span>
        <span>{p.active?'Active':'Inactive'}</span>
        <span className="dotWrap"><button onClick={()=>setMenu(menu===(p._id||p.id)?null:(p._id||p.id))}>•••</button>{menu===(p._id||p.id)&&<div className="dotMenu"><button onClick={()=>{setEdit({...p,emptyOverride:false});setMenu(null);setEditMsg('');}}>Edit Bottle</button><button onClick={()=>del(p)}>Delete Bottle</button></div>}</span>
      </div>)}
    </section>
  </Shell>;
}

function Report({setPage, outlets, products, acl}){
  const [outletId,   setOutletId]   = useState('');
  const [locationId, setLocationId] = useState('');
  const [productId,  setProductId]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [q,          setQ]          = useState('');
  const [rows,       setRows]       = useState([]);
  const [stats,      setStats]      = useState({});
  const [pbData,     setPbData]     = useState(null);
  const [kegData,    setKegData]    = useState(null);
  const [stockData,  setStockData]  = useState(null);
  const [salesData,  setSalesData]  = useState(null);
  const [exciseData, setExciseData] = useState(null);
  const [scmData,    setScmData]    = useState(null);
  const [ncData,     setNcData]     = useState(null);
  const [posRep,     setPosRep]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetched,    setFetched]    = useState(false);

  const isPbType    = typeFilter === 'PREBATCH';
  const isKegType   = typeFilter === 'KEG';
  const isStockType  = typeFilter === 'STOCK_CHECK';
  const isSalesType  = typeFilter === 'SALES';
  const isExciseType = typeFilter === 'EXCISE';
  const isNcType     = typeFilter === 'NC';
  const isPosSalesType = typeFilter === 'POS_SALES';

  const ACTION_LABEL = {
    closing:'Closing', opening:'Opening', ADD_STOCK:'Add Stock', ASSIGN:'Assign',
    TRANSFER:'Transfer', INVENTORY_CLOSING:'Closing', NO_INVENTORY_TAKEN:'No Inventory',
    PREBATCH_DEDUCT:'Pre-Batch Deduct', PREBATCH_PRODUCE:'Pre-Batch Produce', PREBATCH_ASSIGN:'Pre-Batch Assign',
    adjustment:'Stock Correction', STOCK_ADJUST:'Stock Correction',
    KEG_REGISTER:'Keg Registered', KEG_ASSIGN:'Keg Assigned', KEG_TRANSFER:'Keg Transfer',
    KEG_INVENTORY:'Keg Inventory', KEG_WASTAGE:'Keg Wastage', KEG_CLOSED:'Keg Closed',
  };

  const TYPES = [
    {val:'closing',           label:'Closing Inventory'},
    {val:'INVENTORY_CLOSING', label:'Closing Inventory (Auto)'},
    {val:'opening',           label:'Opening Inventory'},
    {val:'ADD_STOCK',         label:'Add Stock'},
    {val:'ASSIGN',            label:'Assign Inventory'},
    {val:'TRANSFER',          label:'Transfer'},
    {val:'PREBATCH',          label:'Pre-Batch'},
    {val:'adjustment',        label:'Stock Correction'},
    {val:'KEG',               label:'Draft Beer Kegs'},
    {val:'STOCK_CHECK',       label:'Stock Check (Current Stock)'},
    {val:'SALES',             label:'Sales Report (Consolidated)'},
    {val:'EXCISE',            label:'Excise Report'},
    {val:'POS_SALES',         label:'POS Sales Report'},
    {val:'NC',                label:'NC Register (POS)'},
  ];

  // Grid columns for the sales and NC tables (depends on money visibility)
  const salesCols = acl?.money!==false
    ? '1.3fr .7fr .7fr .7fr .5fr .7fr .9fr .6fr .9fr .85fr .9fr .7fr .9fr .8fr .85fr'
    : '1.3fr .7fr .7fr .7fr .5fr .9fr .6fr .9fr .85fr .9fr .7fr .9fr';
  const ncCols = acl?.money!==false
    ? '1.3fr .7fr .6fr .8fr 1.4fr .45fr .7fr .8fr 1.1fr .8fr'
    : '1.3fr .7fr .6fr .8fr 1.4fr .45fr .7fr .8fr 1.1fr';

  // Bars of selected outlet
  const outletBars = outletId
    ? (outlets.find(o=>(o._id||o.id)===outletId)?.bars || [])
    : [];

  async function fetchReport(){
    setLoading(true);
    try{
      setNcData(null);
      if(isNcType){
        if(!dateFrom||!dateTo){ alert('Choose a date range for the NC register'); setLoading(false); return; }
        const p=new URLSearchParams({from:dateFrom,to:dateTo});
        setNcData(await api('/pos/nc?'+p.toString()));
        setRows([]);setStats({});setPbData(null);setKegData(null);setStockData(null);setSalesData(null);setExciseData(null);setScmData(null);
        setFetched(true); setLoading(false); return;
      }
      if(isPosSalesType){
        if(!dateFrom||!dateTo){ alert('Choose a date range'); setLoading(false); return; }
        const p=new URLSearchParams({from:dateFrom,to:dateTo});
        if(outletId)   p.set('outletId',outletId);
        if(locationId) p.set('locationId',locationId);
        setPosRep(await api('/reports/pos-sales?'+p.toString()));
        setRows([]);setStats({});setPbData(null);setKegData(null);setStockData(null);setSalesData(null);setExciseData(null); setPosRep(null);setScmData(null);
      } else if(isSalesType){
        if(!dateFrom||!dateTo){ alert('Choose a date range for the sales report'); setLoading(false); return; }
        const p=new URLSearchParams({from:dateFrom,to:dateTo});
        if(outletId)   p.set('outletId',outletId);
        if(locationId) p.set('locationId',locationId);
        if(productId)  p.set('productId',productId);
        setSalesData(await api('/reports/sales?'+p.toString()));
        setRows([]);setStats({});setPbData(null);setKegData(null);setStockData(null);setExciseData(null); setScmData(null);
      } else if(isExciseType){
        if(!dateFrom||!dateTo){ alert('Choose a date range for the excise register'); setLoading(false); return; }
        const p=new URLSearchParams({from:dateFrom,to:dateTo});
        if(outletId) p.set('outletId',outletId);
        const [exc,scm]=await Promise.all([
          api('/reports/excise?'+p.toString()),
          api('/reports/excise/scm-preview?'+p.toString()).catch(()=>null),
        ]);
        setExciseData(exc); setScmData(scm);
        setRows([]);setStats({});setPbData(null);setKegData(null);setStockData(null);setSalesData(null);
      } else if(isStockType){
        // Current stock on hand — no date range, this is a live snapshot
        const params = new URLSearchParams();
        if(outletId)   params.set('outletId',   outletId);
        if(locationId) params.set('locationId', locationId);
        if(productId)  params.set('productId',  productId);
        const data = await api('/reports/stock-check?' + params.toString());
        setStockData(data); setRows([]); setStats({}); setPbData(null); setKegData(null); setSalesData(null); setExciseData(null); setPosRep(null); setScmData(null);
      } else if(isKegType){
        // Draft beer keg report
        const params = new URLSearchParams();
        if(outletId)   params.set('outletId', outletId);
        if(locationId) params.set('locationId', locationId);
        if(dateFrom)   params.set('from', dateFrom);
        if(dateTo)     params.set('to',   dateTo);
        const data = await api('/kegs/report?' + params.toString());
        setKegData(data); setRows([]); setStats({}); setPbData(null); setStockData(null); setSalesData(null); setExciseData(null); setPosRep(null); setScmData(null);
      } else if(isPbType){
        // Pre-batch report
        const params = new URLSearchParams();
        if(outletId) params.set('outletId', outletId);
        if(dateFrom) params.set('from', dateFrom);
        if(dateTo)   params.set('to',   dateTo);
        const data = await api('/pb/report?' + params.toString());
        setPbData(data); setRows([]); setStats({}); setKegData(null); setStockData(null); setSalesData(null); setExciseData(null); setPosRep(null); setScmData(null);
      } else {
        // Inventory report
        const params = new URLSearchParams();
        if(dateFrom) params.set('dateFrom', dateFrom);
        if(dateTo)   params.set('dateTo',   dateTo);
        const data = await api('/reports?' + params.toString());
        setRows(data.rows||[]); setStats({totalConsumption:data.totalConsumption||0, totalSell:data.totalSell||0, stockValue:data.stockValue||0});
        setPbData(null); setKegData(null); setStockData(null); setSalesData(null); setExciseData(null); setPosRep(null); setScmData(null);
      }
      setFetched(true);
    }catch(e){ alert(e.message); }
    setLoading(false);
  }

  function clearAll(){
    setOutletId(''); setLocationId(''); setProductId(''); setTypeFilter('');
    setDateFrom(''); setDateTo(''); setQ(''); setRows([]); setNcData(null); setPbData(null); setKegData(null); setStockData(null); setSalesData(null); setExciseData(null); setPosRep(null); setScmData(null); setFetched(false);
  }

  // Client-side filter for inventory rows
  const displayed = rows.filter(r=>{
    const matchOutlet  = !outletId   || r.outletId?.toString()===outletId   || r.outletName===outlets.find(o=>(o._id||o.id)===outletId)?.name;
    const matchBar     = !locationId || r.locationId?.toString()===locationId;
    const matchProduct = !productId  || r.productId?.toString()===productId;
    const matchType    = !typeFilter || (r.type||r.action)===typeFilter;
    const matchQ       = !q          || (r.productName||'').toLowerCase().includes(q.toLowerCase());
    return matchOutlet && matchBar && matchProduct && matchType && matchQ;
  });

  function exportCsv(){
    const headers=['Date/Time','Outlet','Bar/Stock Room','Brand/Bottle','Category','Bottle Size','Bottle Cost','Op.Full','Op.Open ML','Cl.Full','Cl.Open ML','Consumption ML','Transfer Qty','Total Sell','Type'];
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const csvRows=displayed.map(r=>[
      new Date(r.at).toLocaleString(),r.outletName||'',r.locationName||'',r.productName||'',
      r.category||'',r.bottleSizeMl||'',r.cost||'',
      r.openingFullBottles!=null?r.openingFullBottles:'',r.openingOpenMl!=null?r.openingOpenMl:'',
      r.closingFullBottles!=null?r.closingFullBottles:'',r.closingOpenMl!=null?r.closingOpenMl:'',
      r.consumedMl!=null?r.consumedMl:(r.quantity!=null?r.quantity:''),r.quantity||r.qty||'',
      r.totalSell||'',ACTION_LABEL[r.type||r.action]||r.type||r.action||'',
    ].map(esc).join(','));
    const csv=[headers.join(','),...csvRows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='siroo-report.csv';a.click();
  }

  function exportPosRepCsv(){
    if(!posRep) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const money=acl?.money!==false;
    const headers=['POS Item','Category','Linked Bottle','Bar','Qty','ML',...(money?['Revenue','Cost of Sales']:[]),'Lines'];
    const rows=(posRep.rows||[]).map(r=>[r.posItemName,r.category,r.productName||'not mapped',r.locationName,
      r.qty,r.ml,...(money?[r.value,r.costOfSales]:[]),r.lines].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`siroo-pos-sales-${posRep.from}-to-${posRep.to}.csv`;a.click();
  }

  function exportSalesCsv(){
    if(!salesData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const money = acl?.money!==false;
    const headers=['Brand','Category','Outlet','Location','Bottle Size',...(money?['Bottle Cost']:[]),
      'Opening Bottles','Opening ML','Indent Bottles','Closing Bottles','Closing ML',
      'Consumed ML','Consumed Bottles','POS Sales ML','NC ML','NC Serves','Variance ML','Variance %',
      ...(money?['Variance Value','POS Revenue']:[])];
    const rows=(salesData.rows||[]).map(r=>[r.productName,r.category,r.outletName,r.locationName,r.bottleSizeMl,
      ...(money?[r.cost]:[]),
      r.openingFullBottles,r.openingOpenMl,r.indentBottles,r.closingFullBottles,r.closingOpenMl,
      r.consumedMl,r.consumedBottles,r.posConsumedMl,r.ncMl??'',r.ncQty??'',r.varianceMl,r.variancePct,
      ...(money?[r.varianceValue,r.posSalesValue]:[])].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`siroo-sales-${salesData.from}-to-${salesData.to}.csv`;a.click();
  }

  function exportNcCsv(){
    if(!ncData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const money = acl?.money!==false;
    const headers=['Date/Time','Bill No','Table','Biller','Item','Category','Qty','ML','Bar','Reason',...(money?['Menu Value']:[])];
    const rows=(ncData.items||[]).map(r=>[new Date(r.soldAt).toLocaleString(),r.billNo,r.tableNo,r.biller,r.item,r.category,
      r.quantity,r.ml??'',r.bar||'',r.reason||'',...(money?[r.menuValue]:[])].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`siroo-nc-${dateFrom}-to-${dateTo}.csv`;a.click();
  }

  async function downloadScm(kind){
    const p=new URLSearchParams();
    if(outletId) p.set('outletId',outletId);
    if(kind==='sales'){ p.set('from',dateFrom); p.set('to',dateTo); }
    try{
      const r=await fetch(`${API}/reports/excise/scm-${kind}.xlsx?`+p.toString(),
        {headers:{Authorization:'Bearer '+getToken()}});
      if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error||'Download failed'); }
      const blob=await r.blob();
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=kind==='sales'?`SCM_Sales_${dateFrom}_to_${dateTo}.xlsx`:`SCM_Opening_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
    }catch(e){ alert(e.message); }
  }

  function exportExciseCsv(){
    if(!exciseData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const headers=['Brand','Category','Bottle Size','Opening Bottles','Opening ML','Receipt Bottles',
      'Total Available Bottles','Consumed ML','Consumed Bottles','Closing Bottles','Closing ML','Balance Check ML'];
    const rows=(exciseData.rows||[]).map(r=>[r.brand,r.category,r.bottleSizeMl,r.openingBottles,r.openingMl,
      r.receiptBottles,r.totalAvailableBottles,r.consumedMl,r.consumedBottles,r.closingBottles,r.closingMl,
      r.balanceCheckMl].map(esc).join(','));
    const head=[`"${exciseData.premises?.name||''}"`,`"Period: ${exciseData.from} to ${exciseData.to}"`,''];
    const csv=[...head,headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`siroo-excise-${exciseData.from}-to-${exciseData.to}.csv`;a.click();
  }

  function exportStockCsv(){
    if(!stockData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const headers=['Outlet','Location','Type','Brand / Bottle','Category','Bottle Size','Bottle Cost','Full Bottles','Open ML','Total ML','Equivalent Bottles','Stock Value'];
    const rows=(stockData.rows||[]).map(r=>[
      r.outletName,r.locationName,r.locationType,r.productName,r.category,r.bottleSizeMl,r.cost,
      r.fullBottles,r.openMl,r.totalMl,r.equivalentBottles,r.stockValue,
    ].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='siroo-stock-check.csv';a.click();
  }

  function exportKegCsv(){
    if(!kegData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const headers=['Date/Time','Keg Tag','Beer','Outlet','Location','Event','Opening ML','Closing ML','Consumed ML','Wastage ML','Net Poured ML','Glasses','Pitchers','Towers','Sold ML','Sales Value','Variance ML'];
    const rows=(kegData.logs||[]).map(l=>[
      new Date(l.at).toLocaleString(),l.kegTag||'',l.beerName||'',l.outletName||'',l.locationName||'',l.type||'',
      l.openingMl??'',l.remainingMl??'',l.consumedMl??'',l.wastageMl??'',l.netConsumedMl??'',
      l.glassesSold??'',l.pitchersSold??'',l.towersSold??'',l.soldMl??'',l.salesValue??'',l.varianceMl??'',
    ].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='siroo-keg-report.csv';a.click();
  }

  function exportPbCsv(){
    if(!pbData) return;
    const esc=v=>JSON.stringify(v==null?'':String(v));
    const headers=['Batch#','Recipe','Yield ML','Produced','Expires','Status'];
    const rows=(pbData.batches||[]).map(b=>[b.batchNo,b.recipeName,b.yieldMl,new Date(b.producedAt).toLocaleDateString(),new Date(b.expiresAt).toLocaleDateString(),b.status].map(esc).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='siroo-prebatch-report.csv';a.click();
  }

  return (
    <Shell setPage={setPage}>
      <div className="header">
        <div><h1>Report</h1><p>Apply filters and click Generate Report.</p></div>
        {fetched && !isPbType && !isKegType && !isStockType && !isNcType && !isSalesType && !isPosSalesType && !isExciseType && <button className="addBtn" onClick={exportCsv}>Export CSV</button>}
        {fetched && isStockType && stockData && <button className="addBtn" onClick={exportStockCsv}>Export CSV</button>}
        {fetched && isSalesType && salesData && <button className="addBtn" onClick={exportSalesCsv}>Export CSV</button>}
        {fetched && isNcType && ncData && <button className="addBtn" onClick={exportNcCsv}>Export CSV</button>}
        {fetched && isPosSalesType && posRep && <button className="addBtn" onClick={exportPosRepCsv}>Export CSV</button>}
        {fetched && isExciseType && exciseData && <button className="addBtn" onClick={exportExciseCsv}>Export CSV</button>}
        {fetched &&  isPbType  && pbData  && <button className="addBtn" onClick={exportPbCsv}>Export CSV</button>}
        {fetched &&  isKegType && kegData && <button className="addBtn" onClick={exportKegCsv}>Export CSV</button>}
      </div>

      {/* ── Filters — all simple dropdowns ── */}
      <div className="reportFiltersGrid">
        <div className="filterGroup">
          <label>Outlet</label>
          <select value={outletId} onChange={e=>{setOutletId(e.target.value);setLocationId('');}}>
            <option value="">All Outlets</option>
            {outlets.map(o=><option key={o._id||o.id} value={o._id||o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="filterGroup">
          <label>Bar / Stock Room</label>
          <select value={locationId} onChange={e=>setLocationId(e.target.value)} disabled={!outletId}>
            <option value="">All Locations</option>
            {outletBars.map(b=><option key={b._id?.toString()||b.id} value={b._id?.toString()||b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="filterGroup">
          <label>Product / Brand</label>
          <select value={productId} onChange={e=>setProductId(e.target.value)}>
            <option value="">All Products</option>
            {products.map(p=><option key={p._id||p.id} value={p._id||p.id}>{p.name} ({p.bottleSizeMl}ml)</option>)}
          </select>
        </div>
        <div className="filterGroup">
          <label>Report Type</label>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t=><option key={t.val} value={t.val}>{t.label}</option>)}
          </select>
        </div>
        {!isStockType && <div className="filterGroup">
          <label>Date From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>}
        {!isStockType && <div className="filterGroup">
          <label>Date To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>}
        {!isPbType && !isKegType && !isStockType && !isExciseType && <div className="filterGroup">
          <label>Search Brand</label>
          <label className="searchWrap"><SearchIcon/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand name..."/></label>
        </div>}
      </div>

      <div className="reportActions">
        <button className="generateBtn" onClick={fetchReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
        {fetched && <button className="clearBtn" onClick={clearAll}>Clear All</button>}
      </div>

      {/* ══ INVENTORY REPORT ══ */}
      {fetched && !isPbType && !isKegType && !isStockType && !isSalesType && !isExciseType && !isPosSalesType && !isNcType && <>
        <div className="stats reportStats">
          <div><span>Total Consumption</span><b>{stats.totalConsumption||0} ML</b></div>
          <div><span>Total Sell</span><b>{fmtINR(stats.totalSell)}</b></div>
          <div><span>Stock Value</span><b>{fmtINR(stats.stockValue)}</b></div>
          <div><span>Showing</span><b>{displayed.length} / {rows.length}</b></div>
        </div>
        {displayed.length===0
          ? <p className="noData">No records match the selected filters.</p>
          : <div className="reportTableWrap"><div className="reportTable">
              <div className="reportHead">
                <span>Date/Time</span><span>Outlet</span><span>Bar/Location</span><span>Brand/Bottle</span>
                <span>Category</span><span>Size</span><span>Cost</span><span>Op.Full</span><span>Op.Open ML</span>
                <span>Cl.Full</span><span>Cl.Open ML</span><span>Consumption</span><span>Transfer</span><span>Total Sell</span><span>Type</span>
              </div>
              {displayed.map(r=>(
                <div className="reportRow" key={r._id||r.id}>
                  <span>{new Date(r.at).toLocaleString()}</span>
                  <span>{r.outletName||'-'}</span><span>{r.locationName||'-'}</span><span>{r.productName||'-'}</span>
                  <span>{r.category||'-'}</span><span>{r.bottleSizeMl?r.bottleSizeMl+'ml':'-'}</span>
                  <span>{r.cost?fmtINR(r.cost):'-'}</span>
                  <span>{r.openingFullBottles!=null?r.openingFullBottles:'-'}</span>
                  <span>{r.openingOpenMl!=null?r.openingOpenMl:'-'}</span>
                  <span>{r.closingFullBottles!=null?r.closingFullBottles:'-'}</span>
                  <span>{r.closingOpenMl!=null?r.closingOpenMl:'-'}</span>
                  <span>{r.consumedMl!=null?r.consumedMl+' ML':(r.quantity?r.quantity+' btl':'-')}</span>
                  <span>{r.quantity||r.qty||'-'}</span>
                  <span>{r.totalSell?fmtINR(r.totalSell):'-'}</span>
                  <span className="typePill">{ACTION_LABEL[r.type||r.action]||r.type||r.action||'-'}</span>
                </div>
              ))}
            </div></div>
        }
      </>}

      {/* ══ PRE-BATCH REPORT ══ */}
      {fetched && isPbType && pbData && <>
        <div className="stats reportStats">
          <div><span>Total Produced</span><b>{pbData.summary?.totalProduced||0} ML</b></div>
          <div><span>Total Wasted</span><b style={{color:'#ff7043'}}>{pbData.summary?.totalWasted||0} ML</b></div>
          <div><span>Active Remaining</span><b style={{color:'#7dff9d'}}>{pbData.summary?.totalRemaining||0} ML</b></div>
          <div><span>Active Batches</span><b>{pbData.summary?.activeBatches||0}</b></div>
        </div>

        {/* Batch History */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Batch Production History</h3>
        <div className="reportTableWrap"><div style={{minWidth:750}}>
          <div style={{display:'grid',gridTemplateColumns:'160px 1.4fr .8fr .9fr .9fr .8fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Batch#','Recipe','Yield ML','Produced','Expires','Status'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(pbData.batches||[]).map(b=>(
            <div key={b._id||b.id} style={{display:'grid',gridTemplateColumns:'160px 1.4fr .8fr .9fr .9fr .8fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:12,color:'rgba(255,193,129,.7)'}}>{b.batchNo}</span>
              <span style={{color:'rgba(255,255,255,.85)'}}>{b.recipeName}</span>
              <span>{b.yieldMl} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{new Date(b.producedAt).toLocaleDateString()}</span>
              <span style={{color:new Date(b.expiresAt)<new Date()?'#ff7043':'rgba(255,193,129,.65)',fontSize:13}}>{new Date(b.expiresAt).toLocaleDateString()}</span>
              <span className={`pbStatusPill ${b.status}`}>{b.status}</span>
            </div>
          ))}
          {!(pbData.batches?.length) && <p className="noData">No batches found.</p>}
        </div></div>

        {/* Active Bottles */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Active Bottle Inventory</h3>
        <div className="reportTableWrap"><div style={{minWidth:650}}>
          <div style={{display:'grid',gridTemplateColumns:'110px 1.4fr .9fr .9fr .9fr .8fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Tag','Recipe','Filled ML','Remaining ML','Location','Status'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(pbData.bottles||[]).filter(b=>b.status==='stockroom'||b.status==='assigned').map(b=>(
            <div key={b._id||b.id} style={{display:'grid',gridTemplateColumns:'110px 1.4fr .9fr .9fr .9fr .8fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:13,color:'#ff9638',fontWeight:700}}>{b.tag}</span>
              <span>{b.recipeName}</span>
              <span>{b.filledMl} ML</span>
              <span style={{color:'#7dff9d',fontWeight:700}}>{b.remainingMl} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{b.locationName||'Stock Room'}</span>
              <span className={`pbStatusPill ${b.status}`}>{b.status}</span>
            </div>
          ))}
          {!(pbData.bottles?.filter(b=>b.status==='stockroom'||b.status==='assigned').length) && <p className="noData">No active bottles.</p>}
        </div></div>

        {/* Wastage */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Wastage Records</h3>
        <div className="reportTableWrap"><div style={{minWidth:580}}>
          <div style={{display:'grid',gridTemplateColumns:'140px 1.4fr .8fr 1.4fr .8fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Batch#','Recipe','Waste ML','Reason','Date'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(pbData.wastage||[]).map(w=>(
            <div key={w._id||w.id} style={{display:'grid',gridTemplateColumns:'140px 1.4fr .8fr 1.4fr .8fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:12,color:'rgba(255,193,129,.7)'}}>{w.batchNo}</span>
              <span>{w.recipeName}</span>
              <span style={{color:'#ff7043',fontWeight:700}}>{w.wasteMl} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{w.reason||'-'}</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{new Date(w.at).toLocaleDateString()}</span>
            </div>
          ))}
          {!(pbData.wastage?.length) && <p className="noData">No wastage records.</p>}
        </div></div>
      </>}

      {/* ══ POS SALES REPORT ══ */}
      {fetched && isPosSalesType && posRep && <>
        <div className="stats reportStats">
          <div><span>Orders</span><b>{posRep.summary.orders}</b></div>
          <div><span>Lines</span><b>{posRep.summary.lines}</b></div>
          <div><span>Cancelled</span><b style={{color:'#ff7043'}}>{posRep.summary.cancelled}</b></div>
          <div><span>Unmapped</span><b style={{color:posRep.summary.unmapped?'#ffc181':'#7dff9d'}}>{posRep.summary.unmapped}</b></div>
          <div><span>Poured</span><b>{(posRep.summary.totalMl||0).toLocaleString()} ML</b></div>
          {acl?.money!==false && <div><span>Revenue</span><b style={{color:'#7dff9d'}}>{fmtINR(posRep.summary.totalValue)}</b></div>}
          {acl?.money!==false && <div><span>Cost of Sales</span><b>{fmtINR(posRep.summary.costOfSales)}</b></div>}
        </div>

        {acl?.money!==false && (posRep.byPayment||posRep.bySource) && (
          <div className="posSplitRow">
            <div className="posSplit">
              <b>By Payment</b>
              {Object.entries(posRep.byPayment||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <p key={k}><span>{k}</span><b>{fmtINR(v)}</b></p>
              ))}
            </div>
            <div className="posSplit">
              <b>By Source</b>
              {Object.entries(posRep.bySource||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                <p key={k}><span>{k}</span><b>{fmtINR(v)}</b></p>
              ))}
            </div>
          </div>
        )}

        {posRep.summary.unmapped>0 && (
          <p className="note" style={{marginBottom:14,borderColor:'rgba(255,193,129,.4)'}}>
            {posRep.summary.unmapped} line(s) sold items that aren't mapped to a bottle. They contribute revenue
            but no stock movement, which will read as variance. Map them under Admin → POS Integration.
          </p>
        )}

        <div className="reportTableWrap"><div style={{minWidth:1000}}>
          <div className="posRepHead">
            {['POS Item','Linked Bottle','Bar','Qty','ML',...(acl?.money!==false?['Revenue','Cost of Sales']:[]),'Lines']
              .map(h=><span key={h}>{h}</span>)}
          </div>
          {posRep.rows.map((r,i)=>(
            <div className="posRepRow" key={i}>
              <span style={{color:'#fff2e2'}}>{r.posItemName}
                <small style={{display:'block',opacity:.5}}>{r.category||'—'}{r.kind==='addon'?' · addon':''}</small></span>
              <span style={{color:r.productName?'inherit':'#ffc181'}}>
                {r.productName||'not mapped'}</span>
              <span>{r.locationName||'—'}</span>
              <span>{r.qty}</span>
              <span>{(r.ml||0).toLocaleString()} ML</span>
              {acl?.money!==false && <span style={{color:'#7dff9d',fontWeight:700}}>{fmtINR(r.value)}</span>}
              {acl?.money!==false && <span>{r.costOfSales!=null?fmtINR(r.costOfSales):'—'}</span>}
              <span>{r.lines}</span>
            </div>
          ))}
          {posRep.rows.length===0 && <p className="noData">No POS sales in this period.</p>}
        </div></div>
      </>}

      {/* ══ SALES REPORT — every count of a bottle in the range, collapsed ══ */}
      {fetched && isSalesType && salesData && <>
        <div className="stats reportStats">
          <div><span>Products</span><b>{salesData.summary?.products||0}</b></div>
          <div><span>Indent</span><b>{salesData.summary?.totalIndent||0} btl</b></div>
          <div><span>Consumed</span><b>{(salesData.summary?.totalConsumedMl||0).toLocaleString()} ML</b></div>
          <div><span>POS Sales</span><b>{(salesData.summary?.totalPosMl||0).toLocaleString()} ML</b></div>
          <div><span>NC</span><b>{fmtMl(salesData.summary?.totalNcMl||0)}</b>{acl?.money!==false&&(salesData.summary?.totalNcCostValue||0)>0&&<small style={{color:'#ffc181'}}>{fmtINR(salesData.summary.totalNcCostValue)} at cost</small>}</div>
          <div><span>Variance</span>
            <b style={{color:(salesData.summary?.totalVarianceMl||0)>0?'#ff7043':'#7dff9d'}}>
              {(salesData.summary?.totalVarianceMl||0)>0?'+':''}{(salesData.summary?.totalVarianceMl||0).toLocaleString()} ML</b></div>
          {acl?.money!==false && <div><span>Variance Value</span>
            <b style={{color:(salesData.summary?.totalVarianceValue||0)>0?'#ff7043':'#7dff9d'}}>
              {fmtINR(salesData.summary?.totalVarianceValue||0)}</b></div>}
          {acl?.money!==false && <div><span>POS Revenue</span><b style={{color:'#7dff9d'}}>{fmtINR(salesData.summary?.totalPosSales||0)}</b></div>}
        </div>

        <h3 style={{color:'#ffc181',margin:'20px 0 6px'}}>Consolidated Sales · {salesData.from} to {salesData.to}</h3>
        <p style={{color:'rgba(255,193,129,.5)',fontSize:13,margin:'0 0 12px'}}>
          Opening is taken from the first count in the range, closing from the last. Indent is stock received in between.
          POS Sales and NC are the bills between each count and the one before it. Variance = Consumed − POS Sales − NC.
        </p>

        <div className="reportTableWrap"><div style={{minWidth:1300}}>
          <div className="salesHead" style={{gridTemplateColumns:salesCols}}>
            {['Brand / Bottle','Category','Outlet','Location','Size',...(acl?.money!==false?['Bottle Cost']:[]),
              'Opening','Indent','Closing','Consumed','POS Sales','NC','Variance',
              ...(acl?.money!==false?['Variance ₹','POS Revenue']:[])]
              .map(h=><span key={h}>{h}</span>)}
          </div>
          {(salesData.rows||[]).map(r=>{
            const mismatch = Math.abs(r.consumedMl - r.derivedConsumedMl) > 50;
            return (
              <div className="salesRow" style={{gridTemplateColumns:salesCols}} key={`${r.productId}-${r.locationId}`}>
                <span style={{color:'#fff2e2'}}>{r.productName}{r.notCounted&&<small style={{display:'block',color:'rgba(255,193,129,.55)',fontWeight:400}}>Not counted in this range</small>}</span>
                <span>{r.category||'—'}</span>
                <span>{r.outletName||'—'}</span>
                <span>{r.locationName||'—'}</span>
                <span>{r.bottleSizeMl} ML</span>
                {acl?.money!==false && <span>{r.cost?fmtINR(r.cost):'—'}</span>}
                <span><b>{r.openingFullBottles}</b> btl{r.openingOpenMl?` + ${r.openingOpenMl}ml`:''}</span>
                <span style={{color:r.indentBottles?'#82cfff':'rgba(255,255,255,.4)'}}>
                  {r.indentBottles?`+${r.indentBottles} btl`:'—'}
                </span>
                <span><b>{r.closingFullBottles}</b> btl{r.closingOpenMl?` + ${r.closingOpenMl}ml`:''}</span>
                <span style={{color:'#ffc181'}}>
                  {r.consumedMl.toLocaleString()} ML
                  {mismatch && <small style={{display:'block',color:'#ff7043'}} title="Summed counts differ from opening + indent − closing">
                    ≠ {r.derivedConsumedMl.toLocaleString()}
                  </small>}
                </span>
                <span style={{color:(r.settlements||r.posLines)?'inherit':'rgba(255,255,255,.35)'}}>
                  {(r.settlements||r.posLines) ? `${r.posConsumedMl.toLocaleString()} ML` : 'no POS'}
                </span>
                <span>{(r.settlements||r.posLines)&&r.ncMl ? <>{fmtMl(r.ncMl)}<small style={{display:'block',opacity:.6}}>{r.ncQty} serve(s)</small></> : '—'}</span>
                <span style={{color:r.varianceMl>0?'#ff7043':r.varianceMl<0?'#ffc181':'#7dff9d',fontWeight:700}}>
                  {(r.settlements||r.posLines) ? <>{r.varianceMl>0?'+':''}{r.varianceMl.toLocaleString()} ML
                    {r.variancePct!=null && <small style={{display:'block',opacity:.7}}>{r.variancePct>0?'+':''}{r.variancePct}%</small>}</> : '—'}
                </span>
                {acl?.money!==false && <span style={{color:r.varianceValue>0?'#ff7043':'inherit'}}>
                  {(r.settlements||r.posLines)?fmtINR(r.varianceValue):'—'}</span>}
                {acl?.money!==false && <span style={{color:'#7dff9d',fontWeight:700}}>
                  {(r.settlements||r.posLines)?fmtINR(r.posSalesValue):'—'}</span>}
              </div>
            );
          })}
          {!(salesData.rows?.length) && <p className="noData">No counts found in this date range.</p>}
        </div></div>
      </>}

      {/* ══ NC REGISTER — non-chargeable items punched on the POS ══ */}
      {fetched && isNcType && ncData && <>
        <div className="stats reportStats">
          <div><span>NC Bills</span><b>{ncData.summary?.bills||0}</b></div>
          <div><span>NC Serves</span><b>{ncData.summary?.quantity||0}</b></div>
          <div><span>NC ML</span><b>{fmtMl(ncData.summary?.ncMl||0)}</b></div>
          {acl?.money!==false && <div><span>Menu Value</span><b style={{color:'#ffc181'}}>{fmtINR(ncData.summary?.menuValue||0)}</b></div>}
        </div>
        <h3 style={{color:'#ffc181',margin:'20px 0 6px'}}>NC Register · {dateFrom} to {dateTo}</h3>
        <p style={{color:'rgba(255,193,129,.5)',fontSize:13,margin:'0 0 12px'}}>
          Items billed as NC / complimentary on the POS, or billed at zero. NC ML is taken out of the variance.
        </p>
        <div className="reportTableWrap"><div style={{minWidth:1100}}>
          <div className="salesHead" style={{gridTemplateColumns:ncCols}}>
            {['Date / Time','Bill No','Table','Biller','Item','Qty','ML','Bar','Reason',...(acl?.money!==false?['Menu Value']:[])].map(h=><span key={h}>{h}</span>)}
          </div>
          {(ncData.items||[]).map(r=>(
            <div className="salesRow" style={{gridTemplateColumns:ncCols}} key={r._id}>
              <span>{new Date(r.soldAt).toLocaleString()}</span>
              <span>{r.billNo||'—'}</span>
              <span>{r.tableNo||'—'}</span>
              <span>{r.biller||'—'}</span>
              <span style={{color:'#fff2e2'}}>{r.item}<small style={{display:'block',color:'rgba(255,255,255,.45)'}}>{r.category}</small></span>
              <span>{r.quantity}</span>
              <span>{r.mapped?fmtMl(r.ml):<small style={{color:'#ff7043'}} title="Map this item in POS settings to count its ML">Not mapped</small>}</span>
              <span>{r.bar||'—'}</span>
              <span>{r.reason||'NC'}</span>
              {acl?.money!==false && <span>{fmtINR(r.menuValue)}</span>}
            </div>
          ))}
          {!(ncData.items?.length) && <p className="noData">No NC items in this date range.</p>}
        </div></div>
      </>}

      {/* ══ EXCISE REGISTER ══ */}
      {fetched && isExciseType && exciseData && <>
        <div className="exciseHeader">
          <div>
            <b>{exciseData.premises?.name}</b>
            {exciseData.premises?.address && <span>{exciseData.premises.address}</span>}
            {exciseData.premises?.licenceNo && <span>Licence No: {exciseData.premises.licenceNo}</span>}
          </div>
          <div style={{textAlign:'right'}}>
            <b>Excise Register</b>
            <span>Period: {exciseData.from} to {exciseData.to}</span>
            <span>Generated: {new Date().toLocaleString()}</span>
          </div>
        </div>

        {scmData && (
          <section className="scmPanel">
            <div className="scmHead">
              <div>
                <b>Maharashtra Excise · SCM Portal Upload</b>
                <span>Files formatted for direct upload. The portal builds Form F.L.R. 1A/2A/3A from these.</span>
              </div>
              <span className={`scmBadge ${scmData.ready?'ok':'warn'}`}>
                {scmData.ready?'✓ Ready to upload':'Mapping incomplete'}
              </span>
            </div>

            {!scmData.ready && (
              <div className="scmBlockers">
                {scmData.blockers?.unmapped?.length>0 && (
                  <p><b>{scmData.blockers.unmapped.length} product(s) have no Local Item Code</b> — they will be
                  left out of the upload: {scmData.blockers.unmapped.slice(0,6).join(', ')}
                  {scmData.blockers.unmapped.length>6?` +${scmData.blockers.unmapped.length-6} more`:''}.
                  Map them under Products → Excise Code.</p>
                )}
                {scmData.blockers?.missingCaseSize?.length>0 && (
                  <p><b>{scmData.blockers.missingCaseSize.length} product(s) have no bottles-per-case</b> — the portal
                  needs case counts: {scmData.blockers.missingCaseSize.slice(0,6).join(', ')}
                  {scmData.blockers.missingCaseSize.length>6?` +${scmData.blockers.missingCaseSize.length-6} more`:''}.</p>
                )}
              </div>
            )}

            <div className="scmActions">
              <button className="generateBtn" onClick={()=>downloadScm('sales')}>⬇ Download Sales File (.xlsx)</button>
              <button className="clearBtn" onClick={()=>downloadScm('opening')}>⬇ Download Opening Stock (.xlsx)</button>
              <span className="scmCount">{scmData.rows?.length||0} sale line(s) for this period</span>
            </div>

            {scmData.rows?.length>0 && (
              <div className="reportTableWrap" style={{marginTop:14}}><div style={{minWidth:820}}>
                <div className="scmRowHead">
                  {scmData.header.map(h=><span key={h}>{h}</span>)}
                </div>
                {scmData.rows.slice(0,50).map((r,i)=>(
                  <div className="scmRow" key={i}>
                    <span>{r.saleDate}</span>
                    <span style={{fontFamily:'monospace',fontSize:12,color:'#ff9638'}}>{r.localItemCode}</span>
                    <span>{r.brandName}</span>
                    <span>{r.size}</span>
                    <span>{r.cases}</span>
                    <span>{r.loose}</span>
                  </div>
                ))}
                {scmData.rows.length>50 && (
                  <p style={{color:'rgba(255,193,129,.5)',padding:'10px 12px',fontSize:13}}>
                    Showing first 50 of {scmData.rows.length} — the download contains every line.
                  </p>
                )}
              </div></div>
            )}
          </section>
        )}

        <div className="stats reportStats">
          <div><span>Brands</span><b>{exciseData.summary?.brands||0}</b></div>
          <div><span>Opening</span><b>{(exciseData.summary?.openingTotalMl||0).toLocaleString()} ML</b></div>
          <div><span>Receipts</span><b>{(exciseData.summary?.receiptMl||0).toLocaleString()} ML</b></div>
          <div><span>Consumed</span><b>{(exciseData.summary?.consumedMl||0).toLocaleString()} ML</b></div>
          <div><span>Closing</span><b>{(exciseData.summary?.closingTotalMl||0).toLocaleString()} ML</b></div>
          <div><span>Discrepancies</span>
            <b style={{color:(exciseData.summary?.discrepancies||0)>0?'#ff7043':'#7dff9d'}}>{exciseData.summary?.discrepancies||0}</b></div>
        </div>

        <div className="reportTableWrap"><div style={{minWidth:1150}}>
          <div className="exciseHead">
            {['Brand','Category','Size','Opening Btl','Opening ML','Receipts Btl','Total Available','Consumed ML','Consumed Btl','Closing Btl','Closing ML','Balance']
              .map(h=><span key={h}>{h}</span>)}
          </div>
          {(exciseData.rows||[]).map((r,i)=>(
            <div className="exciseRow" key={r.brand+i}>
              <span style={{color:'#fff2e2'}}>{r.brand}</span>
              <span>{r.category}</span>
              <span>{r.bottleSizeMl}</span>
              <span>{r.openingBottles}</span>
              <span>{r.openingMl}</span>
              <span style={{color:r.receiptBottles?'#82cfff':'rgba(255,255,255,.4)'}}>{r.receiptBottles||'—'}</span>
              <span>{r.totalAvailableBottles}</span>
              <span style={{color:'#ffc181'}}>{r.consumedMl.toLocaleString()}</span>
              <span>{r.consumedBottles}</span>
              <span>{r.closingBottles}</span>
              <span>{r.closingMl}</span>
              <span style={{color:Math.abs(r.balanceCheckMl)>50?'#ff7043':'#7dff9d'}}>
                {r.balanceCheckMl===0?'✓':r.balanceCheckMl}
              </span>
            </div>
          ))}
          {!(exciseData.rows?.length) && <p className="noData">No movement recorded in this period.</p>}
        </div></div>

        <p className="note" style={{marginTop:14}}>
          Balance = Opening + Receipts − Consumed − Closing. Anything other than zero means a count or an
          entry is missing for that brand. Column names differ between states, so confirm the layout against
          your excise office's prescribed form before filing.
        </p>
      </>}

      {/* ══ STOCK CHECK — live stock on hand ══ */}
      {fetched && isStockType && stockData && <>
        <div className="stats reportStats">
          <div><span>Stock Lines</span><b>{stockData.summary?.lines||0}</b></div>
          <div><span>Full Bottles</span><b>{(stockData.summary?.totalFullBottles||0).toLocaleString()}</b></div>
          <div><span>Open ML</span><b>{(stockData.summary?.totalOpenMl||0).toLocaleString()} ML</b></div>
          <div><span>Stock Value</span><b style={{color:'#7dff9d'}}>{fmtINR(stockData.summary?.totalStockValue||0)}</b></div>
          <div><span>Out of Stock</span><b style={{color:(stockData.summary?.outOfStock||0)>0?'#ff7043':'#7dff9d'}}>{stockData.summary?.outOfStock||0}</b></div>
        </div>

        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>
          Current Stock on Hand
          {stockData.rows?.length ? <span style={{color:'rgba(255,193,129,.5)',fontSize:13,fontWeight:400}}> · as of {new Date().toLocaleString()}</span> : null}
        </h3>

        <div className="reportTableWrap"><div style={{minWidth:1080}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr .8fr 1.4fr .9fr .7fr .8fr .8fr .8fr .8fr .9fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Outlet','Location','Type','Brand / Bottle','Category','Size','Cost','Full Btl','Open ML','Total ML','Stock Value'].map(h=>(
              <span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>
            ))}
          </div>
          {(stockData.rows||[]).map(r=>{
            const out = r.totalMl <= 0;
            return (
              <div key={r._id} style={{display:'grid',gridTemplateColumns:'1fr 1fr .8fr 1.4fr .9fr .7fr .8fr .8fr .8fr .8fr .9fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center',opacity:out?.55:1}}>
                <span>{r.outletName||'-'}</span>
                <span>{r.locationName||'-'}</span>
                <span style={{fontSize:12,color:'rgba(255,193,129,.65)'}}>{r.locationType==='stockroom'?'Stock Room':'Bar'}</span>
                <span style={{color:'rgba(255,255,255,.9)'}}>{r.productName}</span>
                <span style={{fontSize:13}}>{r.category||'-'}</span>
                <span style={{fontSize:13}}>{r.bottleSizeMl} ML</span>
                <span>{r.cost?fmtINR(r.cost):'-'}</span>
                <span style={{fontWeight:700,color:out?'#ff7043':'#fff'}}>{r.fullBottles}</span>
                <span>{r.openMl} ML</span>
                <span style={{color:'#ffc181'}}>{(r.totalMl||0).toLocaleString()} ML</span>
                <span style={{color:'#7dff9d',fontWeight:700}}>{fmtINR(r.stockValue)}</span>
              </div>
            );
          })}
          {!(stockData.rows?.length) && <p className="noData">No stock found for the selected filters.</p>}
        </div></div>
      </>}

      {/* ══ DRAFT BEER KEG REPORT ══ */}
      {fetched && isKegType && kegData && <>
        <div className="stats reportStats">
          <div><span>Total Kegs</span><b>{kegData.summary?.totalKegs||0}</b></div>
          <div><span>Active Kegs</span><b style={{color:'#7dff9d'}}>{kegData.summary?.activeKegs||0}</b></div>
          <div><span>Total Consumed</span><b>{(kegData.summary?.totalConsumed||0).toLocaleString()} ML</b></div>
          <div><span>Total Wastage</span><b style={{color:'#ff7043'}}>{(kegData.summary?.totalWasted||0).toLocaleString()} ML</b></div>
          <div><span>Wastage %</span><b style={{color:'#ff7043'}}>{kegData.summary?.wastagePct||'0.0'}%</b></div>
          <div><span>Beer Remaining</span><b>{(kegData.summary?.totalRemaining||0).toLocaleString()} ML</b></div>
        </div>

        <div className="stats reportStats">
          <div><span>Glasses Sold</span><b>{kegData.summary?.totalGlasses||0}</b></div>
          <div><span>Pitchers Sold</span><b>{kegData.summary?.totalPitchers||0}</b></div>
          <div><span>Towers Sold</span><b>{kegData.summary?.totalTowers||0}</b></div>
          <div><span>Total Sold</span><b>{(kegData.summary?.totalSoldMl||0).toLocaleString()} ML</b></div>
          <div><span>Sales Value</span><b style={{color:'#7dff9d'}}>{fmtINR(kegData.summary?.totalSell||0)}</b></div>
          <div><span>Variance</span><b style={{color:Math.abs(kegData.summary?.varianceMl||0)>0?'#ffc446':'#7dff9d'}}>{(kegData.summary?.varianceMl||0).toLocaleString()} ML</b></div>
        </div>

        {/* Keg Master */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Keg Register</h3>
        <div className="reportTableWrap"><div style={{minWidth:900}}>
          <div style={{display:'grid',gridTemplateColumns:'90px 1.3fr .9fr .8fr .8fr .8fr .8fr 1fr .9fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Keg','Beer','Capacity','Tare (g)','Remaining','Consumed','Wastage','Location','Status'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(kegData.kegs||[]).map(k=>(
            <div key={k._id||k.id} style={{display:'grid',gridTemplateColumns:'90px 1.3fr .9fr .8fr .8fr .8fr .8fr 1fr .9fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:13,color:'#ff9638',fontWeight:700}}>{k.kegTag}</span>
              <span style={{color:'rgba(255,255,255,.85)'}}>{k.beerName}</span>
              <span>{(k.capacityMl||0).toLocaleString()} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{(k.tareWeightG||0).toLocaleString()}</span>
              <span style={{color:'#7dff9d',fontWeight:700}}>{(k.remainingMl||0).toLocaleString()} ML</span>
              <span>{(k.totalConsumedMl||0).toLocaleString()} ML</span>
              <span style={{color:'#ff7043'}}>{(k.totalWastageMl||0).toLocaleString()} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{k.locationName||'Stock Room'}</span>
              <span className={`kegPill ${k.status}`}>{k.status}</span>
            </div>
          ))}
          {!(kegData.kegs?.length) && <p className="noData">No kegs found.</p>}
        </div></div>

        {/* Inventory Cycles */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Keg Inventory History</h3>
        <div className="reportTableWrap"><div style={{minWidth:900}}>
          <div style={{display:'grid',gridTemplateColumns:'85px 1.1fr .8fr .7fr .7fr .7fr .5fr .5fr .5fr .7fr .8fr .7fr 1fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Keg','Beer','Event','Opening','Closing','Consumed','Gls','Pit','Twr','Sold','Sales ₹','Var.','Date/Time'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(kegData.logs||[]).map(l=>(
            <div key={l._id||l.id} style={{display:'grid',gridTemplateColumns:'85px 1.1fr .8fr .7fr .7fr .7fr .5fr .5fr .5fr .7fr .8fr .7fr 1fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:13,color:'#ff9638',fontWeight:700}}>{l.kegTag}</span>
              <span>{l.beerName}</span>
              <span className={`kegPill ${l.type}`}>{l.type}</span>
              <span>{l.openingMl!=null?`${l.openingMl}`:'-'}</span>
              <span>{l.remainingMl!=null?`${l.remainingMl}`:'-'}</span>
              <span>{l.consumedMl!=null?`${l.consumedMl}`:'-'}</span>
              <span>{l.glassesSold||'-'}</span>
              <span>{l.pitchersSold||'-'}</span>
              <span>{l.towersSold||'-'}</span>
              <span style={{color:'#7dff9d'}}>{l.soldMl!=null?`${l.soldMl}`:'-'}</span>
              <span style={{color:'#7dff9d'}}>{l.salesValue?fmtINR(l.salesValue):'-'}</span>
              <span style={{color:Math.abs(l.varianceMl||0)>0?'#ffc446':'rgba(255,255,255,.5)'}}>{l.varianceMl!=null?`${l.varianceMl}`:'-'}</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{new Date(l.at).toLocaleString()}</span>
            </div>
          ))}
          {!(kegData.logs?.length) && <p className="noData">No keg inventory records.</p>}
        </div></div>

        {/* Keg Wastage */}
        <h3 style={{color:'#ffc181',margin:'20px 0 10px'}}>Keg Wastage Records</h3>
        <div className="reportTableWrap"><div style={{minWidth:650}}>
          <div style={{display:'grid',gridTemplateColumns:'90px 1.3fr .9fr 1.2fr .7fr .9fr',padding:'0 12px',background:'rgba(231,127,34,.08)',height:42,borderBottom:'1px solid rgba(231,127,34,.2)',alignItems:'center'}}>
            {['Keg','Beer','Waste ML','Reason','Type','Date'].map(h=><span key={h} style={{color:'#ffc181',fontSize:12,fontWeight:700,textTransform:'uppercase'}}>{h}</span>)}
          </div>
          {(kegData.wastage||[]).map(w=>(
            <div key={w._id||w.id} style={{display:'grid',gridTemplateColumns:'90px 1.3fr .9fr 1.2fr .7fr .9fr',padding:'0 12px',height:48,borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
              <span style={{fontFamily:'monospace',fontSize:13,color:'#ff9638',fontWeight:700}}>{w.kegTag}</span>
              <span>{w.beerName}</span>
              <span style={{color:'#ff7043',fontWeight:700}}>{w.wasteMl} ML</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{w.reason||'-'}</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{w.isFinal?'Final':'Cycle'}</span>
              <span style={{color:'rgba(255,193,129,.65)',fontSize:13}}>{new Date(w.at).toLocaleDateString()}</span>
            </div>
          ))}
          {!(kegData.wastage?.length) && <p className="noData">No keg wastage records.</p>}
        </div></div>
      </>}

      {!fetched && !loading && <div className="reportEmpty"><p>Select your filters above and click <b>Generate Report</b>.</p></div>}
    </Shell>
  );
}

const DESIGNATIONS = ['Manager','Assistant Manager','Bar Staff','Bartender','Controller','Storekeeper','Accountant','Auditor','Other'];

function PosStockPage({ setPage, outlets, acl }){
  const [outletId,setOutletId]   = useState('');
  const [locationId,setLocation] = useState('');
  const [tab,setTab]             = useState('stock');
  const [data,setData]           = useState(null);
  const [orders,setOrders]       = useState(null);
  const [settles,setSettles]     = useState(null);
  const [busy,setBusy]           = useState(false);
  const [msg,setMsg]             = useState('');

  const outlet = outlets.find(o=>String(o._id||o.id)===String(outletId));
  const bars   = (outlet?.bars||[]).filter(b=>b.type!=='stockroom');
  const money  = acl?.money!==false;
  const setlCols = money ? '1.3fr 1.5fr .9fr .9fr .8fr 1fr .8fr 1fr' : '1.3fr 1.5fr .9fr .9fr .8fr 1fr 1fr';

  async function load(){
    if(!outletId||!locationId){ setData(null); setOrders(null); setSettles(null); return; }
    setBusy(true); setMsg('');
    const qs=`outletId=${outletId}&locationId=${locationId}`;
    try{
      if(tab==='stock')  setData(await api(`/pos-stock?${qs}`));
      if(tab==='orders') setOrders(await api(`/pos-stock/orders?${qs}`));
      if(tab==='history')setSettles(await api(`/pos-stock/settlements?${qs}`));
    }catch(e){ setMsg(e.message); }
    setBusy(false);
  }
  useEffect(()=>{ load(); },[outletId,locationId,tab]);

  async function settle(){
    if(!confirm('Settle this bar?\n\nThe POS ledger will be reset to match the current shelf count, and the variance for this period will be recorded.')) return;
    setBusy(true);
    try{
      const r=await api('/pos-stock/settle',{method:'POST',body:JSON.stringify({outletId,locationId})});
      setMsg(`Settled — ${r.settled} product(s) recorded.`);
      load();
    }catch(e){ setMsg(e.message); }
    setBusy(false);
  }

  return (
    <Shell setPage={setPage}>
      <div className="header">
        <div>
          <h1>POS Stock</h1>
          <p>What the till believes is on the shelf. Read-only — it moves only when the POS moves.</p>
        </div>
      </div>

      <div className="rptDateRow" style={{marginBottom:16}}>
        <div className="rptDateBox">
          <label>Outlet</label>
          <select value={outletId} onChange={e=>{setOutletId(e.target.value);setLocation('');}}>
            <option value="">Select outlet</option>
            {outlets.map(o=><option key={o._id||o.id} value={o._id||o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="rptDateBox">
          <label>Bar</label>
          <select value={locationId} onChange={e=>setLocation(e.target.value)} disabled={!outletId}>
            <option value="">Select bar</option>
            {bars.map(b=><option key={b._id?.toString()||b.id} value={b._id?.toString()||b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {msg && <p className="inlineMsg">{msg}</p>}
      {!locationId && <p className="noData">Choose an outlet and bar to see its POS ledger.</p>}

      {locationId && <>
        <div className="pbTabs">
          {[['stock','POS Stock'],['orders','Orders Received'],['history','Settlement History']].map(([k,l])=>(
            <button key={k} className={`pbTab ${tab===k?'pbTabOn':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {busy && <p style={{color:'rgba(255,193,129,.5)',padding:8}}>Loading…</p>}

        {tab==='stock' && data && <>
          <div className="stats reportStats">
            <div><span>Products</span><b>{data.summary.products}</b></div>
            <div><span>POS Poured</span><b>{data.summary.posConsumedMl.toLocaleString()} ML</b></div>
            {money && <div><span>POS Revenue</span><b style={{color:'#7dff9d'}}>{fmtINR(data.summary.posSalesValue)}</b></div>}
            <div><span>Order Lines</span><b>{data.summary.posLines}</b></div>
            <div><span>NC Poured</span><b>{(data.summary.ncMl||0).toLocaleString()} ML</b></div>
            <div><span>Short on Shelf</span>
              <b style={{color:data.summary.shortOnShelf?'#ff7043':'#7dff9d'}}>{data.summary.shortOnShelf}</b></div>
          </div>

          <div className="posSettleBar">
            <div>
              <b>Period started {data.anchoredAt?new Date(data.anchoredAt).toLocaleString():'—'}</b>
              <span>Settling resets this ledger to the counted shelf level and banks the variance.</span>
            </div>
            <button className="generateBtn" onClick={settle} disabled={busy}>Settle Stock</button>
          </div>

          <div className="reportTableWrap"><div style={{minWidth:980}}>
            <div className="mirrorHead">
              {['Brand / Bottle','Tracking','POS Stock','Actual Stock','Gap',...(money?['Gap Value']:[]),'POS Poured',...(money?['POS Revenue']:[])]
                .map(h=><span key={h}>{h}</span>)}
            </div>
            {data.rows.map(r=>(
              <div className="mirrorRow" key={r._id}>
                <span style={{color:'#fff2e2'}}>{r.productName}
                  <small style={{display:'block',opacity:.5}}>{r.category} · {r.bottleSizeMl}ml</small></span>
                <span className={`trackTag ${r.trackingMode}`}>{r.trackingMode==='pos'?'POS':'COUNTED'}</span>
                <span style={{color:r.posTotalMl<0?'#ff7043':'inherit'}}>
                  <b>{r.posFullBottles}</b> btl{r.posOpenMl?` + ${r.posOpenMl}ml`:''}
                  {r.posTotalMl<0 && <small style={{display:'block',color:'#ff7043'}}>negative — check mapping</small>}
                </span>
                <span><b>{r.realFullBottles}</b> btl{r.realOpenMl?` + ${r.realOpenMl}ml`:''}</span>
                <span style={{color:r.gapMl<0?'#ff7043':r.gapMl>0?'#ffc181':'#7dff9d',fontWeight:700}}>
                  {r.gapMl>0?'+':''}{r.gapMl.toLocaleString()} ML
                </span>
                {money && <span style={{color:r.gapValue<0?'#ff7043':'inherit'}}>{fmtINR(r.gapValue)}</span>}
                <span>{r.posConsumedMl.toLocaleString()} ML</span>
                {money && <span style={{color:'#7dff9d'}}>{fmtINR(r.posSalesValue)}</span>}
              </div>
            ))}
            {data.rows.length===0 && <p className="noData">No POS activity at this bar yet.</p>}
          </div></div>

          <p className="note" style={{marginTop:14}}>
            A negative gap means less is on the shelf than the till expects. This ledger never changes your
            real stock — the two are kept apart so the difference stays meaningful.
          </p>
        </>}

        {tab==='orders' && orders && <>
          <div className="stats reportStats">
            <div><span>Lines</span><b>{orders.summary.lines}</b></div>
            <div><span>Cancelled</span><b style={{color:'#ff7043'}}>{orders.summary.cancelled}</b></div>
            <div><span>Poured</span><b>{Math.round(orders.summary.totalMl).toLocaleString()} ML</b></div>
            {money && <div><span>Value</span><b style={{color:'#7dff9d'}}>{fmtINR(orders.summary.totalValue)}</b></div>}
          </div>
          <div className="reportTableWrap"><div style={{minWidth:860}}>
            <div className="ordHead">
              {['Time','Order','Item','Qty','ML',...(money?['Value']:[]),'Type'].map(h=><span key={h}>{h}</span>)}
            </div>
            {orders.sales.map(s=>(
              <div className="ordRow" key={s._id} style={{opacity:s.reversed?.5:1}}>
                <span style={{fontSize:12}}>{new Date(s.soldAt).toLocaleString()}</span>
                <span style={{fontFamily:'monospace',fontSize:12}}>{s.posOrderId}</span>
                <span>{s.posItemName}
                  {s.reversed && <small style={{display:'block',color:'#ff7043'}}>cancelled</small>}</span>
                <span>{s.quantity}</span>
                <span>{Math.round((s.quantity||0)*(s.mlPerServe||0))} ML</span>
                {money && <span>{fmtINR(s.lineTotal)}</span>}
                <span style={{fontSize:12,color:'rgba(255,193,129,.6)'}}>{s.orderType||'—'}</span>
              </div>
            ))}
            {orders.sales.length===0 && <p className="noData">No orders for this bar yet.</p>}
          </div></div>
        </>}

        {tab==='history' && settles && <>
          <div className="stats reportStats">
            <div><span>Settlements</span><b>{settles.summary.count}</b></div>
            <div><span>Excess</span><b style={{color:'#ffc181'}}>{settles.summary.excess}</b></div>
            <div><span>Short</span><b style={{color:'#ff7043'}}>{settles.summary.short}</b></div>
            <div><span>Net Variance</span><b>{settles.summary.totalVarianceMl.toLocaleString()} ML</b></div>
            {money && <div><span>Variance Value</span>
              <b style={{color:settles.summary.totalVarianceValue>0?'#ff7043':'#7dff9d'}}>{fmtINR(settles.summary.totalVarianceValue)}</b></div>}
          </div>
          <div className="reportTableWrap"><div style={{minWidth:900}}>
            <div className="setlHead" style={{gridTemplateColumns:setlCols}}>
              {['Settled','Brand','Physical','POS','NC','Variance',...(money?['Value']:[]),'Reason'].map(h=><span key={h}>{h}</span>)}
            </div>
            {settles.records.map(r=>(
              <div className="setlRow" style={{gridTemplateColumns:setlCols}} key={r._id}>
                <span style={{fontSize:12}}>{new Date(r.periodTo).toLocaleString()}</span>
                <span style={{color:'#fff2e2'}}>{r.productName}</span>
                <span>{(r.physicalConsumedMl||0).toLocaleString()} ML</span>
                <span>{(r.posConsumedMl||0).toLocaleString()} ML</span>
                <span>{r.ncMl?`${r.ncMl.toLocaleString()} ML`:'—'}</span>
                <span style={{color:r.varianceMl>0?'#ff7043':r.varianceMl<0?'#ffc181':'#7dff9d',fontWeight:700}}>
                  {r.varianceMl>0?'+':''}{(r.varianceMl||0).toLocaleString()} ML</span>
                {money && <span>{fmtINR(r.varianceValue)}</span>}
                <span style={{fontSize:12,color:'rgba(255,193,129,.6)'}}>{r.reason==='count'?'Physical count':'Manual settle'}</span>
              </div>
            ))}
            {settles.records.length===0 && <p className="noData">No settlements yet. One is recorded automatically each time a count is taken.</p>}
          </div></div>
        </>}
      </>}
    </Shell>
  );
}


function ScmMapper({ product, onMapped }){
  const [q,setQ]       = useState('');
  const [hits,setHits] = useState([]);
  const [busy,setBusy] = useState(false);
  const [per,setPer]   = useState(product.bottlesPerCase||'');
  const [msg,setMsg]   = useState('');

  useEffect(()=>{
    if(!q || q.length<2){ setHits([]); return; }
    const t=setTimeout(async()=>{
      try{ setHits(await api(`/scm/items?q=${encodeURIComponent(q)}&limit=25`)); }catch{}
    },250);
    return ()=>clearTimeout(t);
  },[q]);

  async function link(item){
    setBusy(true); setMsg('');
    try{
      const p=await api('/scm/map',{method:'POST',body:JSON.stringify({
        productId:product._id||product.id, localItemCode:item.localItemCode,
        bottlesPerCase:Number(per)||item.bottlesPerCase||undefined })});
      setPer(p.bottlesPerCase||'');
      setQ(''); setHits([]);
      onMapped(p);
    }catch(e){ setMsg(e.message); }
    setBusy(false);
  }
  async function unlink(){
    setBusy(true);
    try{ onMapped(await api('/scm/map',{method:'POST',body:JSON.stringify({productId:product._id||product.id,localItemCode:''})})); }
    catch(e){ setMsg(e.message); }
    setBusy(false);
  }
  async function saveCase(){
    if(!product.scmItemCode) return;
    setBusy(true);
    try{ onMapped(await api('/scm/map',{method:'POST',body:JSON.stringify({
      productId:product._id||product.id, localItemCode:product.scmItemCode, bottlesPerCase:Number(per)})})); }
    catch(e){ setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div className="scmMapBox">
      <label>Excise Code (Maharashtra SCM portal)</label>
      {msg && <p className="inlineMsg" style={{color:'#ff7043'}}>{msg}</p>}

      {product.scmItemCode ? (
        <>
          <div className="scmCurrent">
            <div>
              <b>{product.scmItemCode}</b>
              <small>{product.scmBrandName} · {product.scmSize}</small>
            </div>
            <button className="pbRemoveBtn" onClick={unlink} disabled={busy} title="Unlink">×</button>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
            <label className="addBottleField" style={{flex:1}}>
              <span>Bottles per Case *</span>
              <input type="number" min="1" value={per} onChange={e=>setPer(e.target.value)} placeholder="e.g. 12"/>
            </label>
            <button className="addBottleSave" style={{height:50,padding:'0 18px'}} onClick={saveCase} disabled={busy||!per}>Save</button>
          </div>
          {!product.bottlesPerCase && (
            <p style={{color:'#ffc181',fontSize:12,marginTop:8}}>
              The portal reports in cases plus loose bottles, so this is required before the file can be generated.
            </p>
          )}
        </>
      ) : (
        <>
          <input className="pbMultiSearch" style={{borderRadius:10,border:'1.5px solid rgba(231,127,34,.4)'}}
                 value={q} onChange={e=>setQ(e.target.value)}
                 placeholder="Search the excise catalogue by brand or code…"/>
          {hits.length>0 && (
            <div className="scmSearchList">
              {hits.map(h=>(
                <button key={h.localItemCode} className="scmSearchItem" onClick={()=>link(h)} disabled={busy}>
                  {h.itemName}
                  <small>{h.localItemCode} · {h.uom} · {h.itemType}{h.bottlesPerCase?` · ${h.bottlesPerCase}/case`:''}</small>
                </button>
              ))}
            </div>
          )}
          {q.length>=2 && hits.length===0 && (
            <p style={{color:'rgba(255,193,129,.5)',fontSize:12,marginTop:8}}>No match in the excise catalogue.</p>
          )}
        </>
      )}
    </div>
  );
}


function ParStockModal({item,outletId,locationId,locationName,existing,onClose,onSaved,setMsg}){
  const [min,setMin] = useState(existing?.minBottles ?? '');
  const [busy,setBusy] = useState(false);
  const current = item.fullBottles ?? 0;

  async function save(){
    const n = Number(min);
    if(!Number.isFinite(n)||n<0) return setMsg('Enter a valid bottle count');
    setBusy(true);
    try{
      await api('/par-stock',{method:'POST',body:JSON.stringify({outletId,locationId,productId:item.productId,minBottles:n})});
      onSaved();
    }catch(e){ setMsg(e.message); }
    setBusy(false);
  }
  async function remove(){
    if(!existing) return;
    setBusy(true);
    try{ await api(`/par-stock/${existing._id}`,{method:'DELETE'}); onSaved(); }
    catch(e){ setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:440}}>
      <div className="addBottleModalHead">
        <h2>Par Stock Alert</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.75)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{item.name}</b><br/>
        at <b>{locationName}</b> · currently <b>{current}</b> bottle{current===1?'':'s'}
      </p>
      <label className="addBottleField">
        <span>Alert when below (bottles) *</span>
        <input type="number" min="0" value={min} onChange={e=>setMin(e.target.value)} placeholder="e.g. 2" autoFocus/>
      </label>
      {Number(min)>0 && (
        <p className="parPreview">
          {current < Number(min)
            ? <>This will alert immediately — stock is <b>{Number(min)-current}</b> below par.</>
            : <>No alert yet. It fires once stock drops below <b>{min}</b>.</>}
        </p>
      )}
      <p style={{color:'rgba(255,193,129,.5)',fontSize:12,marginTop:10}}>
        The alert shows on the dashboard at login. Dismissing it hides it until stock is topped back up to par.
      </p>
      <div className="addBottleActions" style={{marginTop:16}}>
        <button className="addBottleSave" onClick={save} disabled={busy}>{existing?'Update Alert':'Set Alert'}</button>
        {existing && <button className="addBottleCancel" onClick={remove} disabled={busy} style={{color:'#ff7043'}}>Remove</button>}
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

function Transfer({setPage,ctx,products,assign,refreshStock}){
  const [from,setFrom]=useState('');const [to,setTo]=useState('');const [productId,setProduct]=useState('');const [q,setQ]=useState('');const [qty,setQty]=useState(1);const [msg,setMsg]=useState('');const [msgType,setMsgType]=useState('');
  const [assignHistory,setAssignHistory]=useState([]);
  const stockRoom=ctx.outlet?.bars?.find(b=>b.type==='stockroom');
  const bars=ctx.outlet?.bars?.filter(b=>b.type==='bar')||[];
  const locs=ctx.outlet?.bars||[];
  const p=products.find(x=>(x._id||x.id)===productId);
  const suggestions=q&&!p?products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0,6):[];
  const toBar=bars.find(b=>(b._id?.toString()||b.id)===to);
  async function confirm(){
    setMsg('');
    try{
      const srId=stockRoom?._id?.toString()||stockRoom?.id;
      if(assign) await api('/stock/assign',{method:'POST',body:JSON.stringify({outletId:ctx.outlet._id||ctx.outlet.id,fromStockRoomId:srId,toBarId:to,productId,quantity:qty})});
      else await api('/stock/transfer',{method:'POST',body:JSON.stringify({outletId:ctx.outlet._id||ctx.outlet.id,fromLocationId:from,toLocationId:to,productId,quantity:qty})});
      refreshStock?.();
      if(assign){
        // Stay on page — add to history, reset form
        setAssignHistory(h=>[{id:Date.now(),name:p?.name||'',qty,toBar:toBar?.name||to,time:new Date().toLocaleTimeString()},...h].slice(0,8));
        setMsgType('success'); setMsg(`✓ ${qty} bottle(s) of ${p?.name} assigned to ${toBar?.name||to}`);
        setProduct('');setQ('');setQty(1);setTo('');
      } else {
        setMsgType('success'); setMsg('Stock transferred successfully');
        setTimeout(()=>setPage('stock'),800);
      }
    }catch(e){setMsgType('error');setMsg(e.message||'Failed.');}
  }
  return <Shell setPage={setPage}>
    <h1>{assign?'Assign Inventory':'Transfer Stock'}</h1>
    <p>{assign?'Assign bottles from stock room to a bar. You can assign multiple times without leaving this page.':'Transfer stock between bars or back to stock room.'}</p>
    {msg&&<p className={`inlineMsg ${msgType}`}>{msg}</p>}
    <section className="transferGrid">
      <div className="formPanel">
        {assign?<>
          <label>From Stock Room</label>
          <button className="field">{stockRoom?.name||'Stock Room'}</button>
          <label>Assign To Bar</label>
          <Select label="Select Bar" value={to} onChange={setTo} options={bars.map(b=>({...b,id:b._id?.toString()||b.id}))}/>
        </>:<>
          <label>From Bar / Location</label>
          <Select label="From" value={from} onChange={setFrom} options={locs.map(b=>({...b,id:b._id?.toString()||b.id}))}/>
          <label>To Bar / Stock Room</label>
          <Select label="To" value={to} onChange={setTo} options={locs.map(b=>({...b,id:b._id?.toString()||b.id}))}/>
        </>}
        <label>{assign?'Search Bottle From Stock Room':'Search Bottle'}</label>
        {p?<div className="selectedBottle compact"><Bottle/><div><b>{p.name}</b><span>{p.category} • {p.bottleSizeMl} ML</span></div><button onClick={()=>{setProduct('');setQ('')}}>Change</button></div>
          :<><SearchBar value={q} onChange={setQ} text="Search bottle"/>{suggestions.length>0&&<div className="suggestions">{suggestions.map(x=><button key={x._id||x.id} onClick={()=>{setProduct(x._id||x.id);setQ(x.name)}}>{x.name} • {x.category}</button>)}</div>}</>}
        <label>Number of Bottles</label>
        <div className="quantity"><button onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button onClick={()=>setQty(qty+1)}>+</button></div>
        <label>Reason <small style={{color:'rgba(255,255,255,.4)'}}>(optional)</small></label>
        <textarea placeholder="Optional reason" style={{minHeight:64,borderRadius:10,border:'1px solid rgba(201,107,25,.42)',background:'rgba(0,0,0,.35)',color:'white',padding:12}}/>
      </div>
      <aside className="summary">
        {assign
          ? <><h2>Recent Assigns</h2>
              {assignHistory.length===0
                ? <p style={{color:'rgba(255,193,129,.5)',fontSize:14}}><span>No assigns yet this session</span><b>—</b></p>
                : assignHistory.map(x=><p key={x.id}><span>{x.name} → {x.toBar}</span><b>{x.qty} btl</b><small style={{gridColumn:'1/3',color:'#ffc181',fontSize:12}}>{x.time}</small></p>)
              }</>
          : <><h2>Transfer Summary</h2>
              <div className="sumBottle"><Bottle/><b>{p?.name||'Select Bottle'}</b></div>
              <p><span>Bottles</span><b>{qty}</b></p>
              <p><span>Est. Value</span><b>{fmtINR((p?.cost||0)*qty)}</b></p></>
        }
      </aside>
    </section>
    <button disabled={!productId||!to||(!assign&&!from)} className="confirm" onClick={confirm}>{assign?'Confirm Assign':'Confirm Transfer'}</button>
  </Shell>;
}

function AddStock({setPage,ctx,products,refreshStock}){const [productId,setProduct]=useState('');const [q,setQ]=useState('');const [qty,setQty]=useState('');const [recent,setRecent]=useState([]);const [msg,setMsg]=useState(''); const p=products.find(x=>(x._id||x.id)===productId); const suggestions=q&&!p?products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).slice(0,8):[]; async function save(){setMsg(''); try{ if(!productId)return setMsg('Search and select a bottle'); if(!Number(qty))return setMsg('Enter quantity'); const locId=ctx.location?._id?.toString()||ctx.location?.id; await api('/stock/add',{method:'POST',body:JSON.stringify({outletId:ctx.outlet._id||ctx.outlet.id,locationId:locId,productId,quantity:Number(qty)})}); setRecent(r=>[{id:Date.now(),name:p.name,qty,time:new Date().toLocaleTimeString()},...r].slice(0,6)); setProduct('');setQ('');setQty(''); refreshStock(); setMsg('Stock added successfully');}catch(e){setMsg(e.message)} } return <Shell setPage={setPage}><h1>Add Stock</h1><p>Stock can be added only to Stock Room.</p>{msg&&<p className="inlineMsg">{msg}</p>}<div className="addStockGrid"><div className="formPanel"><label>Search Bottle</label>{p?<div className="selectedBottle compact"><Bottle/><div><b>{p.name}</b><span>{p.category} • {p.bottleSizeMl} ML</span></div><button onClick={()=>{setProduct('');setQ('')}}>Change</button></div>:<><SearchBar value={q} onChange={setQ} text="Search bottle from product list"/>{suggestions.length>0&&<div className="suggestions">{suggestions.map(x=><button key={x._id||x.id} onClick={()=>{setProduct(x._id||x.id);setQ(x.name)}}>{x.name} • {x.category} • {x.bottleSizeMl} ML</button>)}</div>}</>}<label>Quantity</label><input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Full bottles"/><button className="confirm" onClick={save}>Add Stock</button></div><aside className="summary recentAdd"><h2>Recently Added Stock</h2>{recent.length?recent.map(x=><p key={x.id}><span>{x.name}</span><b>{x.qty} bottle(s)</b><small>{x.time}</small></p>):<p><span>No recent stock added yet</span><b>-</b></p>}</aside></div></Shell>}

// ── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ setPage, history = [], outlets = [] }) {
  const [search, setSearch]       = useState('');
  const [outletId, setOutletId]   = useState('');
  const [actionFilter, setAction] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo,   setDateTo]     = useState('');

  const ACTION_LABEL = {
    closing:'Closing Inventory', opening:'Opening Inventory',
    ADD_STOCK:'Add Stock', ASSIGN:'Assign', TRANSFER:'Transfer',
    INVENTORY_CLOSING:'Closing', NO_INVENTORY_TAKEN:'No Inventory',
  };

  const ACTION_COLOR = {
    closing:'pill-blue', opening:'pill-green', ADD_STOCK:'pill-orange',
    ASSIGN:'pill-purple', TRANSFER:'pill-teal',
    INVENTORY_CLOSING:'pill-blue', NO_INVENTORY_TAKEN:'pill-gray',
  };

  const filtered = history.filter(r => {
    if (outletId && r.outletId !== outletId && r.outlet?._id !== outletId) return false;
    if (actionFilter && (r.type || r.action) !== actionFilter) return false;
    if (search && !(r.productName || '').toLowerCase().includes(search.toLowerCase()) &&
        !(r.outletName || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && new Date(r.at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(r.at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const actionTypes = [...new Set(history.map(r => r.type || r.action).filter(Boolean))];

  return (
    <Shell setPage={setPage}>
      <div className="header">
        <div><h1>History</h1><p>Full audit trail of all inventory actions.</p></div>
        <span className="histCount">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="histFiltersRow">
        <label className="searchWrap">
          <SearchIcon/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or outlet…"/>
        </label>
        <select value={outletId} onChange={e => setOutletId(e.target.value)}>
          <option value="">All Outlets</option>
          {outlets.map(o => <option key={o._id||o.id} value={o._id||o.id}>{o.name}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setAction(e.target.value)}>
          <option value="">All Actions</option>
          {actionTypes.map(t => <option key={t} value={t}>{ACTION_LABEL[t] || t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date"/>
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To date"/>
        {(search||outletId||actionFilter||dateFrom||dateTo) &&
          <button className="clearBtn" onClick={()=>{setSearch('');setOutletId('');setAction('');setDateFrom('');setDateTo('');}}>Clear</button>}
      </div>

      {/* Records */}
      {history.length === 0 && (
        <div className="reportEmpty"><p>No history records found. History is recorded as inventory actions are performed.</p></div>
      )}

      {history.length > 0 && filtered.length === 0 && (
        <p className="noData">No records match the selected filters.</p>
      )}

      {filtered.length > 0 && (
        <div className="histList">
          {filtered.map((r, i) => {
            const key  = r._id || r.id || i;
            const type = r.type || r.action || '';
            const label = ACTION_LABEL[type] || type || '—';
            const color = ACTION_COLOR[type] || 'pill-gray';
            const date  = r.at ? new Date(r.at) : null;
            return (
              <div className="histCard" key={key}>
                <div className="histCardLeft">
                  <span className={`typePill ${color}`}>{label}</span>
                  <b className="histProduct">{r.productName || r.product?.name || '—'}</b>
                  <span className="histMeta">{r.outletName || '—'} {r.locationName ? `· ${r.locationName}` : ''}</span>
                </div>
                <div className="histCardRight">
                  {r.quantity != null && <span className="histQty">{r.quantity} btl</span>}
                  {r.consumedMl != null && <span className="histQty">{r.consumedMl} ML</span>}
                  {r.totalSell  != null && <span className="histVal">{fmtINR(r.totalSell)}</span>}
                  <span className="histTime">
                    {date ? date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                    <small>{date ? date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''}</small>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// PRE-BATCH MODULE
// ══════════════════════════════════════════════════════════════════════════════

// ── Multi-select ingredient search dropdown ───────────────────────────────────

function PreBatch({ setPage, ctx, outlets, products, pbIngredients, setPbIngredients, mode }) {
  const outletId   = ctx?.outlet?._id?.toString() || ctx?.outlet?.id || '';
  const locationId = ctx?.location?._id?.toString() || ctx?.location?.id || '';
  const locationName = ctx?.location?.name || '';
  const outlet     = ctx?.outlet;
  const bars       = outlet?.bars?.filter(b => b.type === 'bar') || [];

  const [tab,      setTab]     = useState(mode === 'bar' ? 'bottles' : 'recipes');
  const [recipes,  setRecipes] = useState([]);
  const [batches,  setBatches] = useState([]);
  const [bottles,  setBottles] = useState([]);
  const [wastage,  setWastage] = useState([]);
  const [history,  setHist]    = useState([]);
  const [modal,    setModal]   = useState(null);
  const [msg,      setMsg]     = useState('');
  const [loading,  setLoading] = useState(false);

  async function load() {
    if (!outletId) return;
    setLoading(true);
    try {
      const [rec, bat, hist, wast, bots] = await Promise.all([
        api(`/pb/recipes?outletId=${outletId}`),
        api(`/pb/batches?outletId=${outletId}`),
        api(`/pb/batches/history?outletId=${outletId}`),
        api(`/pb/wastage?outletId=${outletId}`),
        api(`/pb/bottles?outletId=${outletId}${locationId?`&locationId=${locationId}`:''}`),
      ]);
      setRecipes(rec||[]); setBatches(bat||[]); setHist(hist||[]);
      setWastage(wast||[]); setBottles(bots||[]);
    } catch(e) { setMsg(e.message); }
    setLoading(false);
  }

  async function loadIngredients() {
    const ings = await api('/pb/ingredients').catch(()=>[]);
    setPbIngredients(ings||[]);
  }

  useEffect(() => { load(); }, [outletId, locationId]);
  useEffect(() => { if(tab==='ingredients') loadIngredients(); }, [tab]);

  const STOCKROOM_TABS = ['recipes','produce','bottles','history','wastage','ingredients'];
  const BAR_TABS       = ['bottles','wastage'];
  const TABS           = mode === 'bar' ? BAR_TABS : STOCKROOM_TABS;
  const TAB_LABELS     = { recipes:'Recipe Master', produce:'Produce Batch', bottles:mode==='bar'?'Batch Bottles':'Bottle Inventory', history:'Batch History', wastage:'Wastage', ingredients:'Ingredients' };

  return (
    <Shell setPage={setPage}>
      <div className="header">
        <div>
          <h1>Pre-Batch — {locationName}</h1>
          <p>{outlet?.name}{mode === 'stockroom' ? ' · Stock Room' : ' · Bar'}</p>
        </div>
      </div>

      <div className="pbTabs">
        {TABS.map(t => (
          <button key={t} className={`pbTab ${tab===t?'pbTabOn':''}`} onClick={()=>setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {msg && <p className="inlineMsg">{msg}</p>}
      {loading && <p style={{color:'rgba(255,193,129,.5)',padding:12}}>Loading…</p>}

      {/* ── RECIPE MASTER ── */}
      {tab==='recipes' && (
        <div>
          <div className="header" style={{marginBottom:16}}>
            <p style={{color:'rgba(255,193,129,.6)',margin:0}}>{recipes.length} recipe{recipes.length!==1?'s':''}</p>
            <button className="addBtn" onClick={()=>setModal({type:'recipe'})}>+ New Recipe</button>
          </div>
          {recipes.length===0 && !loading && <p className="noData">No recipes yet. Create your first recipe.</p>}
          <div className="pbRecipeGrid">
            {recipes.map(r => (
              <div key={r._id||r.id} className="pbRecipeCard">
                <div className="pbRecipeHead">
                  <b>{r.name}</b>
                  <span className="pbPill">{r.yieldMl}ml batch</span>
                </div>
                {r.description && <p style={{color:'rgba(255,193,129,.6)',fontSize:13,margin:'6px 0'}}>{r.description}</p>}
                <div className="pbRecipeMeta">
                  <span>Shelf Life: <b>{r.shelfLifeDays}d</b></span>
                  <span>Ingredients: <b>{r.ingredients?.length||0}</b></span>
                </div>
                <div className="pbRecipeIngList">
                  {(r.ingredients||[]).map((ing,i) => (
                    <span key={i} className="pbIngPill">{ing.name} · {ing.quantityMl}ml</span>
                  ))}
                </div>
                <div className="pbCardActions">
                  <button onClick={()=>setModal({type:'recipe',data:r})}>Edit</button>
                  <button onClick={async()=>{ if(!confirm(`Delete "${r.name}"?`)) return; try{await api(`/pb/recipes/${r._id||r.id}`,{method:'DELETE'});load();}catch(e){setMsg(e.message);} }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRODUCE BATCH ── */}
      {tab==='produce' && (
        <ProduceBatchFlow recipes={recipes} bars={bars} outletId={outletId} locationId={locationId} products={products} onDone={()=>{ load(); setTab('bottles'); }} setMsg={setMsg}/>
      )}

      {/* ── BOTTLE INVENTORY ── */}
      {tab==='bottles' && (
        <BottleInventory bottles={bottles} bars={bars} mode={mode} onRefresh={load} setMsg={setMsg} setModal={setModal}/>
      )}

      {/* ── HISTORY ── */}
      {tab==='history' && (
        <div>
          <div className="pbHistTable">
            <div className="pbHistHead" style={{gridTemplateColumns:'140px 1.4fr .8fr .9fr .9fr .8fr'}}>
              <span>Batch#</span><span>Recipe</span><span>Yield ML</span><span>Produced</span><span>Expires</span><span>Status</span>
            </div>
            {history.map(b => (
              <div key={b._id||b.id} className="pbHistRow" style={{gridTemplateColumns:'140px 1.4fr .8fr .9fr .9fr .8fr'}}>
                <span style={{fontFamily:'monospace',fontSize:12}}>{b.batchNo}</span>
                <span>{b.recipeName}</span>
                <span>{b.yieldMl} ML</span>
                <span>{new Date(b.producedAt).toLocaleDateString()}</span>
                <span>{new Date(b.expiresAt).toLocaleDateString()}</span>
                <span><span className={`pbStatusPill ${b.status}`}>{b.status}</span></span>
              </div>
            ))}
            {history.length===0 && <p className="noData">No batch history yet.</p>}
          </div>
        </div>
      )}

      {/* ── WASTAGE ── */}
      {tab==='wastage' && (
        <div>
          <div className="pbHistTable">
            <div className="pbHistHead" style={{gridTemplateColumns:'140px 1.4fr .8fr 1.4fr .8fr'}}>
              <span>Batch#</span><span>Recipe</span><span>Waste ML</span><span>Reason</span><span>Date</span>
            </div>
            {wastage.map(w => (
              <div key={w._id||w.id} className="pbHistRow" style={{gridTemplateColumns:'140px 1.4fr .8fr 1.4fr .8fr'}}>
                <span style={{fontFamily:'monospace',fontSize:12}}>{w.batchNo}</span>
                <span>{w.recipeName}</span>
                <span style={{color:'#ff7043'}}>{w.wasteMl} ML</span>
                <span>{w.reason||'-'}</span>
                <span>{new Date(w.at).toLocaleDateString()}</span>
              </div>
            ))}
            {wastage.length===0 && <p className="noData">No wastage records yet.</p>}
          </div>
        </div>
      )}

      {/* ── INGREDIENTS ── */}
      {tab==='ingredients' && (
        <IngredientManager pbIngredients={pbIngredients} onReload={loadIngredients} setMsg={setMsg}/>
      )}

      {/* ── MODALS ── */}
      {modal?.type==='recipe'  && <RecipeModal data={modal.data} outletId={outletId} products={products} pbIngredients={pbIngredients} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type==='weigh'   && <WeighModal  bottle={modal.data} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type==='wastage' && <WastageModal bottle={modal.data} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type==='assign'  && <AssignBottleModal bottle={modal.data} bars={bars} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
    </Shell>
  );
}

// ── Bottle Inventory ─────────────────────────────────────────────────────────
function BottleInventory({ bottles, bars, mode, onRefresh, setMsg, setModal }) {
  const stockBottles  = bottles.filter(b => b.status==='stockroom');
  const assignedBottles = bottles.filter(b => b.status==='assigned');
  const display = mode==='bar' ? assignedBottles : bottles.filter(b=>b.status==='stockroom'||b.status==='assigned');

  return (
    <div>
      {display.length===0 && <p className="noData">No bottles yet. Produce a batch first.</p>}
      <div className="pbBatchGrid">
        {display.map(b => (
          <div key={b._id||b.id} className={`pbBatchCard ${b.status}`}>
            <div className="pbBatchHead">
              <b>{b.tag}</b>
              <span className={`pbStatusPill ${b.status}`}>{b.status==='stockroom'?'In Stock Room':b.status==='assigned'?`At ${b.assignedTo||'Bar'}`:b.status}</span>
            </div>
            <div className="pbBatchNo">{b.recipeName} · {b.batchNo}</div>
            <div className="pbRemaining">
              <span>Remaining</span>
              <b>{b.remainingMl != null ? `${b.remainingMl} ML` : '—'}</b>
              <div className="pbProgressBar">
                <div className="pbProgressFill" style={{width:`${Math.max(0,Math.min(100,((b.remainingMl||0)/b.filledMl)*100))}%`}}/>
              </div>
            </div>
            <div className="pbCardActions">
              <button onClick={()=>setModal({type:'weigh',data:b})}>⚖ Weigh</button>
              {b.status==='stockroom' && mode==='stockroom' && (
                <button onClick={()=>setModal({type:'assign',data:b})}>→ Assign to Bar</button>
              )}
              <button onClick={()=>setModal({type:'wastage',data:b})}>Wastage</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Produce Batch Flow (2-step: batch → bottles) ─────────────────────────────
function ProduceBatchFlow({ recipes, bars, outletId, locationId, products, onDone, setMsg }) {
  const [step,       setStep]       = useState(1); // 1=batch details, 2=create bottles
  const [recipeId,   setRecipeId]   = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [batch,      setBatch]      = useState(null);
  const [bottles,    setBottles]    = useState([{ capacityMl:'', filledMl:'', grossWeightG:'' }]);
  const [barId,      setBarId]      = useState('');

  const recipe   = recipes.find(r => (r._id||r.id)===recipeId);
  const totalYield = recipe ? recipe.yieldMl * Number(multiplier||1) : 0;
  const totalFilled = bottles.reduce((s,b) => s + Number(b.filledMl||0), 0);
  const remaining   = totalYield - totalFilled;

  async function produce() {
    if(!recipeId || !barId) return setMsg('Select a recipe and a bar to deduct spirits from');
    setLoading(true); setMsg('');
    try {
      const b = await api('/pb/produce', { method:'POST', body:JSON.stringify({ recipeId, outletId, locationId, multiplier:Number(multiplier||1), notes }) });
      setBatch(b);
      setStep(2);
      setMsg('');
    } catch(e) { setMsg(e.message); }
    setLoading(false);
  }

  async function createBottles() {
    if(!batch) return;
    const invalid = bottles.find(b => !b.capacityMl || !b.filledMl || !b.grossWeightG);
    if(invalid) return setMsg('Fill in capacity, ML poured and gross weight for every bottle');
    if(totalFilled > totalYield) return setMsg(`Total poured (${totalFilled}ml) exceeds batch yield (${totalYield}ml)`);
    setLoading(true); setMsg('');
    try {
      await api(`/pb/batches/${batch._id||batch.id}/bottles`, { method:'POST', body:JSON.stringify({ bottles }) });
      setMsg('');
      onDone();
    } catch(e) { setMsg(e.message); }
    setLoading(false);
  }

  function addBottle()    { setBottles(prev => [...prev, { capacityMl:'', filledMl:'', grossWeightG:'' }]); }
  function removeBottle(i){ setBottles(prev => prev.filter((_,idx)=>idx!==i)); }
  function updateBottle(i, k, v){ setBottles(prev => prev.map((b,idx)=>idx===i?{...b,[k]:v}:b)); }

  if (step === 2 && batch) return (
    <div className="pbProduceForm">
      <div className="emptyWtPreview" style={{marginBottom:18}}>
        <span>Batch produced: <b>{batch.recipeName}</b></span>
        <span>Batch#: <b style={{fontFamily:'monospace'}}>{batch.batchNo}</b></span>
        <span>Total Yield: <b>{totalYield} ML</b> · Filled so far: <b>{totalFilled} ML</b> · Remaining: <b>{Math.max(0,remaining)} ML</b></span>
      </div>

      <h3 style={{color:'#ffc181',marginBottom:14}}>Create Bottles</h3>
      {bottles.map((b,i) => (
        <div key={i} className="pbBottleRow">
          <span className="pbBottleTag">#{String(i+1).padStart(2,'0')}</span>
          <label className="addBottleField">
            <span>Bottle Capacity (ml)</span>
            <input type="number" value={b.capacityMl} onChange={e=>updateBottle(i,'capacityMl',e.target.value)} placeholder="e.g. 1000"/>
          </label>
          <label className="addBottleField">
            <span>ML Poured In</span>
            <input type="number" value={b.filledMl} onChange={e=>updateBottle(i,'filledMl',e.target.value)} placeholder="e.g. 950"/>
          </label>
          <label className="addBottleField">
            <span>Total Weight (g) from Scale</span>
            <input type="number" value={b.grossWeightG} onChange={e=>updateBottle(i,'grossWeightG',e.target.value)} placeholder="e.g. 1820"/>
          </label>
          {bottles.length > 1 && (
            <button className="pbRemoveBtn" onClick={()=>removeBottle(i)} style={{marginTop:22}}>×</button>
          )}
        </div>
      ))}

      <div style={{display:'flex',gap:12,marginTop:14}}>
        <button className="clearBtn" onClick={addBottle}>+ Add Another Bottle</button>
        <button className="addBottleSave" style={{flex:1,height:48}} onClick={createBottles} disabled={loading}>
          {loading ? 'Creating...' : `Create ${bottles.length} Bottle${bottles.length!==1?'s':''}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pbProduceForm">
      <div className="addBottlePriceGrid">
        <label className="addBottleField">
          <span>Select Recipe *</span>
          <select value={recipeId} onChange={e=>setRecipeId(e.target.value)} style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:recipeId?'#fff':'rgba(255,255,255,.4)',padding:'0 16px',fontSize:15}}>
            <option value="">Select a recipe</option>
            {recipes.map(r=><option key={r._id||r.id} value={r._id||r.id}>{r.name} ({r.yieldMl}ml)</option>)}
          </select>
        </label>
        <label className="addBottleField">
          <span>Deduct Spirits from Bar *</span>
          <select value={barId} onChange={e=>setBarId(e.target.value)} style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:barId?'#fff':'rgba(255,255,255,.4)',padding:'0 16px',fontSize:15}}>
            <option value="">Select bar</option>
            {bars.map(b=><option key={b._id?.toString()||b.id} value={b._id?.toString()||b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="addBottleField">
          <span>Batch Multiplier</span>
          <input type="number" min="1" max="20" value={multiplier} onChange={e=>setMultiplier(Math.max(1,Number(e.target.value)))} placeholder="1"/>
        </label>
        <label className="addBottleField">
          <span>Notes (optional)</span>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Made for weekend"/>
        </label>
      </div>

      {recipe && (
        <div style={{marginTop:14,border:'1px solid rgba(255,150,56,.2)',borderRadius:12,padding:14,background:'rgba(0,0,0,.2)'}}>
          <b style={{color:'#ffc181'}}>Spirits to be deducted from bar:</b>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
            {(recipe.ingredients||[]).filter(i=>i.type==='spirit').map((i,idx)=>(
              <span key={idx} className="pbIngPill" style={{background:'rgba(255,100,56,.1)',borderColor:'rgba(255,100,56,.3)'}}>
                {i.name}: <b>{i.quantityMl*Number(multiplier||1)}ml</b>
              </span>
            ))}
          </div>
          <div style={{marginTop:8,color:'rgba(255,193,129,.6)',fontSize:13}}>
            Total yield: <b style={{color:'#ffc181'}}>{totalYield}ml</b>
          </div>
        </div>
      )}

      <button className="addBottleSave" style={{marginTop:18,width:'100%',height:52,fontSize:17}} onClick={produce} disabled={loading||!recipeId||!barId}>
        {loading ? 'Producing...' : '⚗ Produce Batch'}
      </button>
    </div>
  );
}

// ── Ingredient Manager ────────────────────────────────────────────────────────
function IngredientManager({ pbIngredients, onReload, setMsg }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ name:'', density:'', unit:'ml', description:'' });
  const [editId,  setEditId]  = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function save() {
    if(!form.name||!form.density) return setMsg('Name and density are required');
    try {
      if(editId) await api(`/pb/ingredients/${editId}`,{method:'PUT',body:JSON.stringify(form)});
      else       await api('/pb/ingredients',            {method:'POST',body:JSON.stringify(form)});
      setForm({name:'',density:'',unit:'ml',description:''}); setShowAdd(false); setEditId(null);
      onReload(); setMsg('');
    } catch(e) { setMsg(e.message); }
  }

  async function del(id, name) {
    if(!confirm(`Delete "${name}"?`)) return;
    try { await api(`/pb/ingredients/${id}`,{method:'DELETE'}); onReload(); }
    catch(e) { setMsg(e.message); }
  }

  function startEdit(ing) {
    setForm({name:ing.name,density:ing.density,unit:ing.unit||'ml',description:ing.description||''});
    setEditId(ing._id||ing.id); setShowAdd(true);
  }

  return (
    <div>
      <div className="header" style={{marginBottom:16}}>
        <p style={{color:'rgba(255,193,129,.6)',margin:0}}>Non-alcoholic ingredients used in pre-batch recipes.</p>
        <button className="addBtn" onClick={()=>{setShowAdd(v=>!v);setEditId(null);setForm({name:'',density:'',unit:'ml',description:''});}}>
          {showAdd?'Cancel':'+ Add Ingredient'}
        </button>
      </div>
      {showAdd && (
        <div className="pbAddIngForm">
          <label className="addBottleField"><span>Name *</span><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Sugar Syrup"/></label>
          <label className="addBottleField"><span>Density (g/ml) *</span><input type="number" step="0.01" value={form.density} onChange={e=>set('density',e.target.value)} placeholder="e.g. 1.33"/></label>
          <label className="addBottleField"><span>Description</span><input value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Optional"/></label>
          <button className="addBottleSave" onClick={save}>{editId?'Save':'Add'}</button>
        </div>
      )}
      <div className="pbIngTable">
        <div className="pbIngHead"><span>Name</span><span>Density (g/ml)</span><span>Notes</span><span>Action</span></div>
        {pbIngredients.map(ing=>(
          <div key={ing._id||ing.id} className="pbIngRow">
            <span>{ing.name}</span>
            <span style={{color:'#ff9638',fontWeight:700}}>{ing.density}</span>
            <span style={{color:'rgba(255,193,129,.6)',fontSize:13}}>{ing.description||'-'}</span>
            <span style={{display:'flex',gap:8}}>
              <button onClick={()=>startEdit(ing)} style={{border:'1px solid rgba(255,150,56,.4)',borderRadius:8,background:'transparent',color:'#ff9638',padding:'4px 12px',cursor:'pointer',fontSize:13}}>Edit</button>
              <button onClick={()=>del(ing._id||ing.id,ing.name)} style={{border:'1px solid rgba(255,80,60,.3)',borderRadius:8,background:'transparent',color:'#ff7043',padding:'4px 12px',cursor:'pointer',fontSize:13}}>Delete</button>
            </span>
          </div>
        ))}
        {pbIngredients.length===0 && <p className="noData">No ingredients yet.</p>}
      </div>
    </div>
  );
}

// ── Weigh Modal ───────────────────────────────────────────────────────────────
function WeighModal({ bottle, onClose, onSaved, setMsg }) {
  const [grossWt,   setGrossWt]   = useState('');
  const [remaining, setRemaining] = useState(null);
  const [countRes,  setCountRes]  = useState(null);
  const [loading,   setLoading]   = useState(false);

  async function read() {
    if(!grossWt) return setMsg('Enter the weight from the scale');
    setLoading(true);
    try {
      const r = await api(`/pb/bottles/${bottle._id||bottle.id}/weigh`, { method:'POST', body:JSON.stringify({ grossWeightG: Number(grossWt) }) });
      setRemaining(r.remainingMl); setCountRes(r);
    } catch(e) { setMsg(e.message); }
    setLoading(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:440}}>
      <div className="addBottleModalHead">
        <h2>Weigh Bottle</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{bottle.tag}</b> · {bottle.recipeName}
      </p>
      <label className="addBottleField">
        <span>Place bottle on scale and enter weight (g)</span>
        <input type="number" value={grossWt} onChange={e=>setGrossWt(e.target.value)} placeholder="e.g. 1340" autoFocus/>
      </label>
      {remaining !== null && (
        <div style={{marginTop:14,textAlign:'center',border:'1px solid rgba(255,150,56,.3)',borderRadius:12,padding:20,background:'rgba(255,150,56,.06)'}}>
          <span style={{color:'rgba(255,193,129,.6)',fontSize:13,display:'block'}}>Remaining</span>
          <b style={{fontSize:48,color:'#ff9638',display:'block',margin:'8px 0'}}>{remaining} ML</b>
          {countRes?.posConnected && (
            <small style={{display:'block',color:'rgba(255,193,129,.8)',fontSize:13}}>
              Consumed {fmtMl(countRes.consumedMl)} · POS sold {fmtMl(countRes.posSoldMl)}{countRes.ncMl?` · NC ${fmtMl(countRes.ncMl)}`:''} ·{' '}
              <b style={{color:varianceColor(countRes.varianceMl,750)}}>Variance {fmtMl(countRes.varianceMl)}</b>
            </small>
          )}
        </div>
      )}
      <div className="addBottleActions" style={{marginTop:16}}>
        {remaining === null
          ? <button className="addBottleSave" onClick={read} disabled={loading}>{loading?'Reading...':'Read Scale'}</button>
          : <button className="addBottleSave" onClick={onSaved}>Save & Close</button>
        }
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Assign Bottle Modal ───────────────────────────────────────────────────────
function AssignBottleModal({ bottle, bars, onClose, onSaved, setMsg }) {
  const [barId, setBarId] = useState('');
  async function assign() {
    if(!barId) return setMsg('Select a bar');
    const bar = bars.find(b=>(b._id?.toString()||b.id)===barId);
    try {
      await api(`/pb/bottles/${bottle._id||bottle.id}/assign`, { method:'POST', body:JSON.stringify({ toBarId:barId, toBarName:bar?.name||barId }) });
      onSaved();
    } catch(e) { setMsg(e.message); }
  }
  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:400}}>
      <div className="addBottleModalHead">
        <h2>Assign to Bar</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        Bottle <b style={{color:'#fff'}}>{bottle.tag}</b> · {bottle.remainingMl}ml remaining
      </p>
      <div className="field" style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
        <span style={{color:'#ffc181',fontWeight:700}}>Select Bar *</span>
        <select value={barId} onChange={e=>setBarId(e.target.value)} style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:barId?'#fff':'rgba(255,255,255,.4)',padding:'0 16px',fontSize:15}}>
          <option value="">Select bar</option>
          {bars.map(b=><option key={b._id?.toString()||b.id} value={b._id?.toString()||b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="addBottleActions">
        <button className="addBottleSave" onClick={assign}>Assign Bottle</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Wastage Modal ─────────────────────────────────────────────────────────────
function WastageModal({ bottle, onClose, onSaved, setMsg }) {
  const [wasteMl, setWasteMl] = useState('');
  const [reason,  setReason]  = useState('');
  async function save() {
    if(!wasteMl) return setMsg('Enter waste amount in ML');
    try {
      await api(`/pb/bottles/${bottle._id||bottle.id}/wastage`, { method:'POST', body:JSON.stringify({ wasteMl:Number(wasteMl), reason }) });
      onSaved();
    } catch(e) { setMsg(e.message); }
  }
  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:400}}>
      <div className="addBottleModalHead">
        <h2>Record Wastage</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{bottle.tag}</b> · {bottle.remainingMl}ml remaining
      </p>
      <label className="addBottleField"><span>Waste Amount (ML) *</span><input type="number" value={wasteMl} onChange={e=>setWasteMl(e.target.value)} placeholder="e.g. 200" autoFocus/></label>
      <label className="addBottleField" style={{marginTop:12}}><span>Reason</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Expired, Spilled"/></label>
      <div className="addBottleActions" style={{marginTop:16}}>
        <button className="addBottleSave" onClick={save}>Record</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Recipe Modal ──────────────────────────────────────────────────────────────
function RecipeModal({ data, outletId, products, pbIngredients, onClose, onSaved, setMsg }) {
  const [name,      setName]      = useState(data?.name||'');
  const [desc,      setDesc]      = useState(data?.description||'');
  const [yieldMl,   setYieldMl]   = useState(data?.yieldMl||'');
  const [shelfDays, setShelfDays] = useState(data?.shelfLifeDays||7);
  const [spirits,   setSpirits]   = useState(data?.ingredients?.filter(i=>i.type==='spirit').map(i=>({id:i.productId,name:i.name,density:i.density||0.93,quantityMl:i.quantityMl}))||[]);
  const [nonAlc,    setNonAlc]    = useState(data?.ingredients?.filter(i=>i.type==='nonalcohol').map(i=>({id:i.ingredientId,name:i.name,density:i.density||1.00,quantityMl:i.quantityMl}))||[]);

  async function save() {
    if(!name||!yieldMl) return setMsg('Name and yield are required');
    const ingredients = [
      ...spirits.map(s=>({type:'spirit',    productId:s.id,    name:s.name, quantityMl:Number(s.quantityMl||0), density:Number(s.density||0.93)})),
      ...nonAlc.map(n=>({type:'nonalcohol', ingredientId:n.id, name:n.name, quantityMl:Number(n.quantityMl||0), density:Number(n.density||1.00)})),
    ];
    if(!ingredients.length)                              return setMsg('Add at least one ingredient');
    if(ingredients.some(i=>!i.quantityMl||i.quantityMl<=0)) return setMsg('All ingredients need a quantity in ML');
    try {
      if(data?._id||data?.id) await api(`/pb/recipes/${data._id||data.id}`,{method:'PUT',body:JSON.stringify({name,description:desc,yieldMl:Number(yieldMl),shelfLifeDays:Number(shelfDays),ingredients})});
      else                     await api('/pb/recipes',                      {method:'POST',body:JSON.stringify({outletId,name,description:desc,yieldMl:Number(yieldMl),shelfLifeDays:Number(shelfDays),ingredients})});
      onSaved();
    } catch(e) { setMsg(e.message); }
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:640,maxHeight:'90vh',overflowY:'auto'}}>
      <div className="addBottleModalHead">
        <h2>{data?'Edit Recipe':'New Recipe'}</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <div className="addBottlePriceGrid">
        <label className="addBottleField"><span>Recipe Name *</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Classic Mojito Batch"/></label>
        <label className="addBottleField"><span>Yield ML per batch *</span><input type="number" value={yieldMl} onChange={e=>setYieldMl(e.target.value)} placeholder="e.g. 5000"/></label>
        <label className="addBottleField"><span>Shelf Life (days)</span><input type="number" value={shelfDays} onChange={e=>setShelfDays(e.target.value)}/></label>
        <label className="addBottleField"><span>Description</span><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Optional"/></label>
      </div>
      <div style={{marginTop:16}}>
        <label style={{color:'#ffc181',fontWeight:700,fontSize:14,display:'block',marginBottom:8}}>Spirit Ingredients (deducted from bar inventory)</label>
        <SpiritMultiSelect products={products} selected={spirits} onChange={setSpirits}/>
      </div>
      <div style={{marginTop:16}}>
        <label style={{color:'#ffc181',fontWeight:700,fontSize:14,display:'block',marginBottom:8}}>Non-Alcoholic Ingredients</label>
        <IngredientMultiSelect options={pbIngredients} selected={nonAlc} onChange={setNonAlc} placeholder="Search and select non-alcoholic ingredients"/>
      </div>
      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={save}>{data?'Save Recipe':'Create Recipe'}</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Multi-select: Non-Alcoholic Ingredients ───────────────────────────────────
function IngredientMultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState('');
  const filtered = options.filter(o => o.name.toLowerCase().includes(q.toLowerCase()) && !selected.find(s=>s.id===(o._id||o.id)));
  function add(item){ onChange([...selected,{id:item._id||item.id,name:item.name,density:item.density||1.00,quantityMl:''}]); setQ(''); }
  function remove(id){ onChange(selected.filter(s=>s.id!==id)); }
  function updateQty(id,qty){ onChange(selected.map(s=>s.id===id?{...s,quantityMl:qty}:s)); }
  return (
    <div className="pbMultiWrap">
      <div className="pbMultiTrigger" onClick={()=>setOpen(v=>!v)}>
        {selected.length===0?<span style={{color:'rgba(255,255,255,.4)'}}>{placeholder||'Search ingredients'}</span>:<span style={{color:'#ffc181'}}>{selected.length} selected</span>}
        <span style={{fontSize:10,color:'rgba(255,193,129,.5)',marginLeft:'auto'}}>{open?'▲':'▼'}</span>
      </div>
      {open&&<div className="pbMultiPanel"><input className="pbMultiSearch" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." autoFocus onClick={e=>e.stopPropagation()}/><div className="pbMultiList">{filtered.length===0?<span className="pbMultiEmpty">No ingredients found</span>:filtered.map(item=><button key={item._id||item.id} className="pbMultiItem" onClick={()=>add(item)}><span>{item.name}</span><small style={{opacity:.6}}>{item.density}g/ml</small></button>)}</div></div>}
      {selected.length>0&&<div className="pbSelectedList">{selected.map(s=><div key={s.id} className="pbSelectedItem"><span className="pbSelectedName">{s.name}</span><input type="number" min="1" className="pbQtyInput" placeholder="ML" value={s.quantityMl} onChange={e=>updateQty(s.id,e.target.value)}/><button className="pbRemoveBtn" onClick={()=>remove(s.id)}>×</button></div>)}</div>}
    </div>
  );
}

// ── Multi-select: Spirits ────────────────────────────────────────────────────
function SpiritMultiSelect({ products, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState('');
  const filtered = products.filter(p=>(`${p.name} ${p.category}`).toLowerCase().includes(q.toLowerCase())&&!selected.find(s=>s.id===(p._id||p.id)));
  function add(p){ onChange([...selected,{id:p._id||p.id,name:p.name,category:p.category,bottleSizeMl:p.bottleSizeMl,density:0.93,quantityMl:''}]); setQ(''); }
  function remove(id){ onChange(selected.filter(s=>s.id!==id)); }
  function updateQty(id,qty){ onChange(selected.map(s=>s.id===id?{...s,quantityMl:qty}:s)); }
  return (
    <div className="pbMultiWrap">
      <div className="pbMultiTrigger" onClick={()=>setOpen(v=>!v)}>
        {selected.length===0?<span style={{color:'rgba(255,255,255,.4)'}}>Search and select spirits</span>:<span style={{color:'#ffc181'}}>{selected.length} selected</span>}
        <span style={{fontSize:10,color:'rgba(255,193,129,.5)',marginLeft:'auto'}}>{open?'▲':'▼'}</span>
      </div>
      {open&&<div className="pbMultiPanel"><input className="pbMultiSearch" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search spirit..." autoFocus onClick={e=>e.stopPropagation()}/><div className="pbMultiList">{filtered.length===0?<span className="pbMultiEmpty">No spirits found</span>:filtered.map(p=><button key={p._id||p.id} className="pbMultiItem" onClick={()=>add(p)}><span>{p.name}</span><small style={{opacity:.6}}>{p.category}·{p.bottleSizeMl}ml</small></button>)}</div></div>}
      {selected.length>0&&<div className="pbSelectedList">{selected.map(s=><div key={s.id} className="pbSelectedItem"><span className="pbSelectedName">{s.name}</span><input type="number" min="1" className="pbQtyInput" placeholder="ML" value={s.quantityMl} onChange={e=>updateQty(s.id,e.target.value)}/><button className="pbRemoveBtn" onClick={()=>remove(s.id)}>×</button></div>)}</div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// DRAFT BEER KEG MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const KEG_WASTAGE_REASONS = ['Spillage', 'Foam', 'Cleaning', 'Line Flush', 'Other'];

function kegPct(k) {
  if (!k?.capacityMl) return 0;
  return Math.max(0, Math.min(100, ((k.remainingMl || 0) / k.capacityMl) * 100));
}
function kegStatusLabel(k) {
  if (k.status === 'closed')    return 'Closed';
  if (k.status === 'stockroom') return 'In Stock Room';
  return k.locationName ? `Active · ${k.locationName}` : 'Active';
}

const BEER_DENSITY = 1.01;
const SERVE_TYPES = [
  { key:'glasses',  label:'Glass',   ml:330,  priceKey:'glass'   },
  { key:'pitchers', label:'Pitcher', ml:1500, priceKey:'pitcher' },
  { key:'towers',   label:'Tower',   ml:3000, priceKey:'tower'   },
];

function KegModule({ setPage, ctx, products, master, outlets, mode }) {
  const outletId     = ctx?.outlet?._id?.toString() || ctx?.outlet?.id || '';
  const locationId   = ctx?.location?._id?.toString() || ctx?.location?.id || '';
  const locationName = ctx?.location?.name || '';
  const outlet       = ctx?.outlet;
  const bars         = outlet?.bars?.filter(b => b.type === 'bar') || [];

  const [tab,     setTab]     = useState('kegs');
  const [kegs,    setKegs]    = useState([]);
  const [beers,   setBeers]   = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [wastage, setWastage] = useState([]);
  const [modal,   setModal]   = useState(null);
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(false);
  const [q,       setQ]       = useState('');

  async function load() {
    if (!outletId) return;
    setLoading(true);
    try {
      // Stock Room sees every keg in the outlet; a bar sees only what is assigned to it
      const kegQs = mode === 'bar'
        ? `?outletId=${outletId}&locationId=${locationId}`
        : `?outletId=${outletId}`;
      const locQs = mode === 'bar' ? `&locationId=${locationId}` : '';
      const [k, b, l, w] = await Promise.all([
        api(`/kegs${kegQs}`),
        api(`/draft-beers?outletId=${outletId}`),
        api(`/kegs-logs?outletId=${outletId}${locQs}`),
        api(`/kegs-wastage?outletId=${outletId}${locQs}`),
      ]);
      setKegs(k || []); setBeers(b || []); setLogs(l || []); setWastage(w || []);
    } catch (e) { setMsg(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [outletId, locationId, mode]);

  const TABS       = mode === 'bar' ? ['kegs','beers','history','wastage'] : ['kegs','beers','closed','history','wastage'];
  const TAB_LABELS = { kegs: mode==='bar' ? 'Active Kegs' : 'Keg Registry', beers:'Beers', closed:'Closed Kegs', history:'Inventory History', wastage:'Wastage' };

  const liveKegs   = kegs.filter(k => k.status !== 'closed');
  const closedKegs = kegs.filter(k => k.status === 'closed');
  const match      = k => `${k.beerName} ${k.kegTag} ${k.locationName||''}`.toLowerCase().includes(q.toLowerCase());
  const shown      = liveKegs.filter(match);

  const totalRemaining = liveKegs.reduce((s,k) => s + (k.remainingMl||0), 0);
  const totalWasted    = wastage.reduce((s,w) => s + (w.wasteMl||0), 0);

  return (
    <Shell setPage={setPage}>
      <div className="header">
        <div>
          <h1>Draft Beer Kegs — {locationName}</h1>
          <p>{outlet?.name}{mode === 'stockroom' ? ' · Stock Room' : ' · Bar'}</p>
        </div>
        {mode === 'stockroom' && tab !== 'beers' && (
          <button className="addBtn" onClick={() => setModal({ type:'register' })}>+ Create Keg</button>
        )}
        {tab === 'beers' && (
          <button className="addBtn" onClick={() => setModal({ type:'addBeer' })}>+ Add Beer Brand</button>
        )}
      </div>

      <div className="kegStats">
        <div><span>Active Kegs</span><b>{liveKegs.filter(k=>k.status==='active').length}</b></div>
        {mode === 'stockroom' && <div><span>In Stock Room</span><b>{liveKegs.filter(k=>k.status==='stockroom').length}</b></div>}
        <div><span>Beer Remaining</span><b>{totalRemaining.toLocaleString()} ML</b></div>
        <div><span>Total Wastage</span><b style={{color:'#ff7043'}}>{totalWasted.toLocaleString()} ML</b></div>
      </div>

      <div className="pbTabs">
        {TABS.map(t => (
          <button key={t} className={`pbTab ${tab===t?'pbTabOn':''}`} onClick={()=>setTab(t)}>{TAB_LABELS[t]}</button>
        ))}
      </div>

      {msg && <p className="inlineMsg">{msg}</p>}
      {loading && <p style={{color:'rgba(255,193,129,.5)',padding:12}}>Loading…</p>}

      {/* ── KEG REGISTRY / ACTIVE KEGS ── */}
      {tab === 'kegs' && (
        <div>
          <SearchBar value={q} onChange={setQ} text="Search by beer name, keg tag or bar"/>
          {shown.length === 0 && !loading && (
            <p className="noData">
              {mode === 'bar'
                ? 'No kegs assigned to this bar yet. Assign a keg from the Stock Room.'
                : 'No kegs yet. Click “Create Keg” when you connect a new keg.'}
            </p>
          )}
          <div className="kegGrid">
            {shown.map(k => (
              <div key={k._id||k.id} className={`kegCard ${k.status}`}>
                <div className="kegCardHead">
                  <div>
                    <span className="kegTag">{k.kegTag}</span>
                    <b>{k.beerName}</b>
                  </div>
                  <span className={`kegPill ${k.status}`}>{kegStatusLabel(k)}</span>
                </div>

                <div className="kegRemaining">
                  <span>Remaining</span>
                  <b>{(k.remainingMl||0).toLocaleString()} ML</b>
                  <div className="pbProgressBar">
                    <div className="pbProgressFill" style={{width:`${kegPct(k)}%`}}/>
                  </div>
                  <small>{kegPct(k).toFixed(0)}% of {(k.capacityMl||0).toLocaleString()} ML</small>
                </div>

                <div className="kegMeta">
                  <span>Consumed <b>{(k.totalConsumedMl||0).toLocaleString()} ML</b></span>
                  <span>Wastage <b style={{color:'#ff7043'}}>{(k.totalWastageMl||0).toLocaleString()} ML</b></span>
                  <span>Last Count <b>{k.lastInventoryAt ? new Date(k.lastInventoryAt).toLocaleDateString() : '—'}</b></span>
                </div>

                {k.assignments?.length > 0 && (
                  <div className="kegBarList">
                    {k.assignments.map((a,i) => <span key={i} className="pbIngPill">{a.barName}</span>)}
                  </div>
                )}

                <div className="pbCardActions">
                  <button onClick={()=>setModal({ type:'inventory', data:k })}>⚖ Take Inventory</button>
                  {mode === 'stockroom' && (
                    <button onClick={()=>setModal({ type:'assign', data:k })}>→ Assign to Bar</button>
                  )}
                  <button onClick={()=>setModal({ type:'wastage', data:k })}>Wastage</button>
                  <button className="kegEmptyBtn" onClick={()=>setModal({ type:'empty', data:k })}>Declare Empty</button>
                  <button onClick={()=>setModal({ type:'detail', data:k })}>Lifecycle</button>
                  {mode === 'stockroom' && !k.lastInventoryAt && (
                    <button onClick={async()=>{
                      if(!confirm(`Delete ${k.kegTag} — ${k.beerName}?`)) return;
                      try { await api(`/kegs/${k._id||k.id}`,{method:'DELETE'}); load(); } catch(e){ setMsg(e.message); }
                    }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BEERS (draft beer brand list) ── */}
      {tab === 'beers' && (
        <div>
          <p style={{color:'rgba(255,193,129,.6)',fontSize:13,margin:'0 0 14px'}}>
            Beers used on draft at this outlet. Add from the master list, or create your own craft brand.
            Serve prices here drive the keg sales report.
          </p>
          {beers.length === 0 && !loading && (
            <p className="noData">No beers added yet. Click “Add Beer Brand” to build your draft list.</p>
          )}
          <div className="beerGrid">
            {beers.map(b => (
              <div key={b._id||b.id} className={`beerCard ${b.active===false?'inactive':''}`}>
                <div className="beerCardHead">
                  <div>
                    <b>{b.name}</b>
                    <span className="beerSrc">{b.source === 'craft' ? 'Craft' : 'Master List'}</span>
                  </div>
                  {b.active === false && <span className="kegPill closed">Inactive</span>}
                </div>
                <div className="beerPrices">
                  {SERVE_TYPES.map(s => (
                    <div key={s.key}>
                      <span>{s.label} · {b.servings?.[s.key==='glasses'?'glassMl':s.key==='pitchers'?'pitcherMl':'towerMl'] ?? s.ml} ML</span>
                      <b>{b.pricing?.[s.priceKey] ? fmtINR(b.pricing[s.priceKey]) : '—'}</b>
                    </div>
                  ))}
                </div>
                <div className="pbCardActions">
                  <button onClick={()=>setModal({ type:'editBeer', data:b })}>Edit</button>
                  <button onClick={async()=>{
                    if(!confirm(`Delete ${b.name} from your Beers list?`)) return;
                    try { await api(`/draft-beers/${b._id||b.id}`,{method:'DELETE'}); load(); }
                    catch(e){ setMsg(e.message); }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CLOSED KEGS ── */}
      {tab === 'closed' && (
        <div className="pbHistTable">
          <div className="pbHistHead" style={{gridTemplateColumns:'100px 1.4fr 1fr .9fr .9fr .9fr 1fr'}}>
            <span>Keg</span><span>Beer</span><span>Capacity</span><span>Consumed</span><span>Wastage</span><span>Waste %</span><span>Closed On</span>
          </div>
          {closedKegs.map(k => (
            <div key={k._id||k.id} className="pbHistRow" style={{gridTemplateColumns:'100px 1.4fr 1fr .9fr .9fr .9fr 1fr'}}>
              <span style={{fontFamily:'monospace',color:'#ff9638',fontWeight:700}}>{k.kegTag}</span>
              <span>{k.beerName}</span>
              <span>{(k.capacityMl||0).toLocaleString()} ML</span>
              <span>{(k.totalConsumedMl||0).toLocaleString()} ML</span>
              <span style={{color:'#ff7043'}}>{(k.totalWastageMl||0).toLocaleString()} ML</span>
              <span>{k.totalConsumedMl ? ((k.totalWastageMl/k.totalConsumedMl)*100).toFixed(1) : '0.0'}%</span>
              <span>{k.closedAt ? new Date(k.closedAt).toLocaleDateString() : '—'}</span>
            </div>
          ))}
          {closedKegs.length === 0 && <p className="noData">No closed kegs yet.</p>}
        </div>
      )}

      {/* ── INVENTORY HISTORY ── */}
      {tab === 'history' && (
        <div className="pbHistTable">
          <div className="pbHistHead" style={{gridTemplateColumns:'110px 1.2fr .9fr .8fr .8fr .8fr .8fr .9fr'}}>
            <span>Keg</span><span>Beer</span><span>Event</span><span>Opening</span><span>Closing</span><span>Consumed</span><span>Wastage</span><span>Date</span>
          </div>
          {logs.map(l => (
            <div key={l._id||l.id} className="pbHistRow" style={{gridTemplateColumns:'110px 1.2fr .9fr .8fr .8fr .8fr .8fr .9fr'}}>
              <span style={{fontFamily:'monospace',color:'#ff9638',fontWeight:700}}>{l.kegTag}</span>
              <span>{l.beerName}</span>
              <span><span className={`kegPill ${l.type}`}>{l.type}{l.posMode?' · POS':''}</span></span>
              <span>{l.openingMl != null ? `${l.openingMl} ML` : '—'}</span>
              <span>{l.remainingMl != null ? `${l.remainingMl} ML` : '—'}</span>
              <span>{l.consumedMl != null ? `${l.consumedMl} ML` : '—'}</span>
              <span style={{color:'#ff7043'}}>{l.wastageMl ? `${l.wastageMl} ML` : '—'}</span>
              <span>{new Date(l.at).toLocaleString()}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="noData">No keg inventory history yet.</p>}
        </div>
      )}

      {/* ── WASTAGE ── */}
      {tab === 'wastage' && (
        <div className="pbHistTable">
          <div className="pbHistHead" style={{gridTemplateColumns:'110px 1.3fr .9fr 1.2fr .8fr .9fr'}}>
            <span>Keg</span><span>Beer</span><span>Waste ML</span><span>Reason</span><span>Type</span><span>Date</span>
          </div>
          {wastage.map(w => (
            <div key={w._id||w.id} className="pbHistRow" style={{gridTemplateColumns:'110px 1.3fr .9fr 1.2fr .8fr .9fr'}}>
              <span style={{fontFamily:'monospace',color:'#ff9638',fontWeight:700}}>{w.kegTag}</span>
              <span>{w.beerName}</span>
              <span style={{color:'#ff7043',fontWeight:700}}>{w.wasteMl} ML</span>
              <span>{w.reason || '—'}</span>
              <span>{w.isFinal ? 'Final' : 'Cycle'}</span>
              <span>{new Date(w.at).toLocaleString()}</span>
            </div>
          ))}
          {wastage.length === 0 && <p className="noData">No wastage recorded yet.</p>}
        </div>
      )}

      {/* ── MODALS ── */}
      {modal?.type === 'register'  && <RegisterKegModal outletId={outletId} locationId={locationId} beers={beers} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} onAddBeer={()=>setModal({type:'addBeer'})} setMsg={setMsg}/>}
      {modal?.type === 'inventory' && <KegInventoryModal keg={modal.data} beers={beers} locationId={locationId} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} onDeclareEmpty={(k)=>setModal({type:'empty',data:k})} setMsg={setMsg}/>}
      {(modal?.type === 'addBeer' || modal?.type === 'editBeer') && <BeerBrandModal beer={modal.type==='editBeer'?modal.data:null} master={master} outlets={outlets} outletId={outletId} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);setTab('beers');}}/>}
      {modal?.type === 'assign'    && <AssignKegModal    keg={modal.data} bars={bars} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type === 'wastage'   && <KegWastageModal   keg={modal.data} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type === 'empty'     && <DeclareKegEmptyModal keg={modal.data} onClose={()=>setModal(null)} onSaved={()=>{load();setModal(null);}} setMsg={setMsg}/>}
      {modal?.type === 'detail'    && <KegLifecycleModal keg={modal.data} onClose={()=>setModal(null)} setMsg={setMsg}/>}
    </Shell>
  );
}

// ── Beer Brand Modal (Beers list) ─────────────────────────────────────────────
function BeerBrandModal({ beer, master, outlets, outletId, onClose, onSaved }) {
  const isEdit = Boolean(beer);
  const [craft,    setCraft]    = useState(isEdit ? beer.source === 'craft' : false);
  const [masterQ,  setMasterQ]  = useState('');
  const [masterId, setMasterId] = useState(beer?.masterBottleId || '');
  const [name,     setName]     = useState(beer?.name || '');
  const [glass,    setGlass]    = useState(beer?.pricing?.glass   ?? '');
  const [pitcher,  setPitcher]  = useState(beer?.pricing?.pitcher ?? '');
  const [tower,    setTower]    = useState(beer?.pricing?.tower   ?? '');
  const [glassMl,  setGlassMl]  = useState(beer?.servings?.glassMl   ?? 330);
  const [pitcherMl,setPitcherMl]= useState(beer?.servings?.pitcherMl ?? 1500);
  const [towerMl,  setTowerMl]  = useState(beer?.servings?.towerMl   ?? 3000);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  // Beer-like entries from the admin master bottle list
  const beerMaster = (master || []).filter(m => /beer|lager|ale|draught|draft|stout|pilsner|cider|wheat|ipa/i.test(`${m.category} ${m.name}`));
  const rows = (beerMaster.length ? beerMaster : (master || []))
    .filter(m => `${m.name} ${m.category}`.toLowerCase().includes(masterQ.toLowerCase()))
    .slice(0, 8);

  async function save() {
    setErr('');
    if (!isEdit && !craft && !masterId)  return setErr('Select a beer from the master list, or switch to craft beer');
    if ((craft || isEdit) && !name.trim()) return setErr('Enter the beer name');
    if (!Number(glass) && !Number(pitcher) && !Number(tower))
      return setErr('Enter a price for at least one serve size');

    const payload = {
      name: name.trim(),
      pricing:  { glass:Number(glass||0), pitcher:Number(pitcher||0), tower:Number(tower||0) },
      servings: { glassMl:Number(glassMl||330), pitcherMl:Number(pitcherMl||1500), towerMl:Number(towerMl||3000) },
      outletIds: outletId ? [outletId] : [],
    };
    setSaving(true);
    try {
      if (isEdit) await api(`/draft-beers/${beer._id||beer.id}`, { method:'PUT', body: JSON.stringify(payload) });
      else        await api('/draft-beers', { method:'POST', body: JSON.stringify({ ...payload, masterBottleId: craft ? null : masterId }) });
      onSaved();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:600}}>
      <div className="addBottleModalHead">
        <h2>{isEdit ? 'Edit Beer' : 'Add Beer Brand'}</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p className="addBottleModalSub">
        {isEdit ? 'Update serve sizes and pricing for this draft beer.'
                : 'Pick a brand from the master list, or create your own craft beer.'}
      </p>
      {err && <p className="inlineMsg" style={{color:'#ff7043'}}>{err}</p>}

      {!isEdit && (
        <div className="kegToggleRow">
          <button className={!craft?'kegToggleOn':''} onClick={()=>setCraft(false)}>From Master List</button>
          <button className={ craft?'kegToggleOn':''} onClick={()=>{setCraft(true);setMasterId('');}}>Craft Beer</button>
        </div>
      )}

      {!isEdit && !craft && (
        <div className="addBottleSearch" style={{marginTop:14}}>
          <label>Search Beer Brand</label>
          <SearchBar value={masterQ} onChange={(v)=>{setMasterQ(v);setMasterId('');}} text="Search beers from the master list"/>
          {masterQ && <div className="modalList">
            {rows.length ? rows.map(m => (
              <button key={m._id||m.id}
                      className={masterId===(m._id||m.id)?'selected':''}
                      onClick={()=>{setMasterId(m._id||m.id);setName(m.name);setMasterQ(m.name);}}>
                <div className="modalBottleRow">
                  <Bottle tone="orange"/>
                  <div><b>{m.name}</b><small>{m.category}</small></div>
                  {masterId===(m._id||m.id) && <span className="checkmark">✓</span>}
                </div>
              </button>
            )) : <span className="noResults">No beer found in the master list — try Craft Beer instead</span>}
          </div>}
        </div>
      )}

      {(craft || isEdit) && (
        <label className="addBottleField" style={{marginTop:14}}>
          <span>Beer Name *</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Hazy Valley IPA"
                 disabled={isEdit && beer.source !== 'craft'}/>
        </label>
      )}

      <div className="beerPriceSection">
        <label className="beerPriceLabel">Serve Pricing *</label>
        <div className="beerPriceGrid">
          <div className="beerPriceHead"><span>Serve</span><span>Size (ML)</span><span>Price (₹)</span></div>
          <div className="beerPriceRow">
            <span>Glass</span>
            <input type="number" value={glassMl} onChange={e=>setGlassMl(e.target.value)}/>
            <input type="number" value={glass} onChange={e=>setGlass(e.target.value)} placeholder="0"/>
          </div>
          <div className="beerPriceRow">
            <span>Pitcher</span>
            <input type="number" value={pitcherMl} onChange={e=>setPitcherMl(e.target.value)}/>
            <input type="number" value={pitcher} onChange={e=>setPitcher(e.target.value)} placeholder="0"/>
          </div>
          <div className="beerPriceRow">
            <span>Tower</span>
            <input type="number" value={towerMl} onChange={e=>setTowerMl(e.target.value)}/>
            <input type="number" value={tower} onChange={e=>setTower(e.target.value)} placeholder="0"/>
          </div>
        </div>
      </div>

      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={save} disabled={saving}>{saving?'Saving…':(isEdit?'Save Changes':'Add Beer')}</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Register Keg Modal ────────────────────────────────────────────────────────
function RegisterKegModal({ outletId, locationId, beers, onClose, onSaved, onAddBeer, setMsg }) {
  const [manual,     setManual]     = useState(false);
  const [draftBeerId,setDraftBeerId]= useState('');
  const [beerName,   setBeerName]   = useState('');
  const [kegTag,     setKegTag]     = useState('');
  const [capacityMl, setCapacityMl] = useState('');
  const [fullWeight, setFullWeight] = useState('');
  const [cost,       setCost]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const activeBeers = (beers || []).filter(b => b.active !== false);

  async function save() {
    setErr('');
    if (!manual && !draftBeerId)    return setErr('Select a beer, or switch to manual entry');
    if (manual && !beerName.trim()) return setErr('Enter the draft beer name');
    if (!kegTag.trim())             return setErr('Enter a keg tag, e.g. Keg 1');
    if (!Number(capacityMl))        return setErr('Enter the keg capacity in ML');
    if (!Number(fullWeight))        return setErr('Enter the total weight of the full keg in grams');

    setSaving(true);
    try {
      await api('/kegs', { method:'POST', body: JSON.stringify({
        outletId, locationId,
        draftBeerId: manual ? null : draftBeerId,
        beerName:    manual ? beerName.trim() : undefined,
        kegTag: kegTag.trim(),
        capacityMl:  Number(capacityMl),
        fullWeightG: Number(fullWeight),
        costPerKeg:  Number(cost || 0),
        notes,
      })});
      onSaved();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:600}}>
      <div className="addBottleModalHead">
        <h2>Create Keg</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.65)',fontSize:13,margin:'0 0 16px'}}>
        Register a keg when it is physically connected. Each keg is tracked as its own inventory asset.
      </p>
      {err && <p className="inlineMsg" style={{color:'#ff7043'}}>{err}</p>}

      <div className="kegToggleRow">
        <button className={!manual?'kegToggleOn':''} onClick={()=>setManual(false)}>Select Beer</button>
        <button className={ manual?'kegToggleOn':''} onClick={()=>setManual(true)}>Enter Manually</button>
      </div>

      {!manual ? (
        <label className="addBottleField" style={{marginTop:12}}>
          <span>Beer *</span>
          <select value={draftBeerId} onChange={e=>setDraftBeerId(e.target.value)}
                  style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:draftBeerId?'#fff':'rgba(255,255,255,.4)',padding:'0 16px',fontSize:15}}>
            <option value="">Select beer</option>
            {activeBeers.map(b => <option key={b._id||b.id} value={b._id||b.id}>{b.name}</option>)}
          </select>
          {activeBeers.length === 0 && (
            <small style={{display:'block',color:'rgba(255,193,129,.7)',fontSize:12,marginTop:6}}>
              No beers in your list yet — <button type="button" onClick={onAddBeer}
                style={{background:'none',border:0,color:'#ff9638',cursor:'pointer',padding:0,fontSize:12,textDecoration:'underline'}}>add a beer brand first</button>.
            </small>
          )}
        </label>
      ) : (
        <label className="addBottleField" style={{marginTop:12}}>
          <span>Draft Beer Name *</span>
          <input value={beerName} onChange={e=>setBeerName(e.target.value)} placeholder="e.g. House Draught Lager"/>
        </label>
      )}

      <div className="addBottlePriceGrid" style={{marginTop:14}}>
        <label className="addBottleField">
          <span>Keg Tag *</span>
          <input value={kegTag} onChange={e=>setKegTag(e.target.value)} placeholder="e.g. Keg 1"/>
        </label>
        <label className="addBottleField">
          <span>Keg Capacity (ML) *</span>
          <input type="number" value={capacityMl} onChange={e=>setCapacityMl(e.target.value)} placeholder="e.g. 30000"/>
        </label>
        <label className="addBottleField">
          <span>Total Weight of Full Keg (g) *</span>
          <input type="number" value={fullWeight} onChange={e=>setFullWeight(e.target.value)} placeholder="e.g. 41000"/>
        </label>
        <label className="addBottleField">
          <span>Keg Cost (optional)</span>
          <input type="number" value={cost} onChange={e=>setCost(e.target.value)} placeholder="e.g. 9000"/>
        </label>
      </div>

      <label className="addBottleField" style={{marginTop:14}}>
        <span>Notes</span>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional"/>
      </label>

      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={save} disabled={saving}>{saving?'Creating…':'Create Keg'}</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Keg Inventory Modal — user enters only the current weight ─────────────────
function KegInventoryModal({ keg, beers, locationId, onClose, onSaved, onDeclareEmpty, setMsg }) {
  const [step,    setStep]    = useState(1);   // 1 = weight, 2 = sales, 3 = wastage, 4 = result
  const [weight,  setWeight]  = useState('');
  const [result,  setResult]  = useState(null);
  const [waste,   setWaste]   = useState('');
  const [reason,  setReason]  = useState('Spillage');
  const [glasses, setGlasses] = useState('');
  const [pitchers,setPitchers]= useState('');
  const [towers,  setTowers]  = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  // When the POS bills this beer at the keg's bar, sales come from the bills and
  // wastage is whatever left the keg beyond them — only the reason is asked.
  const [pos,     setPos]     = useState(undefined);   // undefined = checking
  useEffect(() => {
    api(`/kegs/${keg._id||keg.id}/pos-preview`).then(setPos).catch(() => setPos({ posConnected:false }));
  }, [keg._id, keg.id]);
  const posMode = Boolean(pos?.posConnected);

  // Serve sizes and prices come from the keg's beer in the Beers list
  const beer      = (beers || []).find(b => String(b._id||b.id) === String(keg.draftBeerId||'')) || null;
  const glassMl   = Number(beer?.servings?.glassMl   ?? 330);
  const pitcherMl = Number(beer?.servings?.pitcherMl ?? 1500);
  const towerMl   = Number(beer?.servings?.towerMl   ?? 3000);
  const soldMl    = Number(glasses||0)*glassMl + Number(pitchers||0)*pitcherMl + Number(towers||0)*towerMl;
  const salesValue= Number(glasses||0)*Number(beer?.pricing?.glass||0)
                  + Number(pitchers||0)*Number(beer?.pricing?.pitcher||0)
                  + Number(towers||0)*Number(beer?.pricing?.tower||0);

  // Preview the cycle locally so the user sees the numbers before committing
  const preview = (() => {
    const w = Number(weight);
    if (!w) return null;
    const d = keg.densityGPerMl || 1;
    const remaining = Math.max(0, Math.min(Math.round((w - keg.tareWeightG) / d), keg.capacityMl));
    const opening   = keg.remainingMl ?? keg.capacityMl;
    return { remaining, opening, consumed: Math.max(0, opening - remaining) };
  })();

  // Net poured = consumed this cycle minus wastage. Sales are checked against this,
  // exactly like the server does, so step 3 can never be rejected on submit.
  const netPoured = Math.max(0, (preview?.consumed ?? 0) - Number(waste || 0));
  // POS mode: billed = sold + NC; anything beyond that is wastage
  const posBilled = posMode ? Number(pos.soldMl||0) + Number(pos.ncMl||0) : 0;
  const posWaste  = posMode ? Math.max(0, (preview?.consumed ?? 0) - posBilled) : 0;

  async function submitPos() {
    setErr('');
    if (!weight) return setErr('Enter the current weight of the keg');
    if (step === 1) {
      if (preview && preview.remaining > preview.opening)
        return setErr('Weight is higher than the last count — re-check the reading');
      setStep(2); return;
    }
    if (posWaste > 0 && !reason) return setErr('Choose a reason for the wastage');
    setLoading(true);
    try {
      const r = await api(`/kegs/${keg._id||keg.id}/inventory`, { method:'POST', body: JSON.stringify({
        currentWeightG: Number(weight),
        wastageReason: posWaste > 0 ? reason : undefined,
        locationId,
      })});
      setResult(r);
      setStep(4);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  async function submit() {
    setErr('');
    if (!weight) return setErr('Enter the current weight of the keg');
    if (step === 1) {
      if (preview && preview.remaining > preview.opening)
        return setErr('Weight is higher than the last count — re-check the reading');
      setStep(2); return;
    }
    if (step === 2) {
      const w = Number(waste || 0);
      if (w < 0) return setErr('Wastage cannot be negative');
      if (preview && w > preview.consumed)
        return setErr(`Wastage cannot exceed the ${preview.consumed.toLocaleString()} ML consumed this cycle`);
      setStep(3); return;
    }
    if (soldMl > netPoured)
      return setErr(`Recorded sales (${soldMl.toLocaleString()} ML) exceed the ${netPoured.toLocaleString()} ML poured this cycle after wastage`);

    setLoading(true);
    try {
      const r = await api(`/kegs/${keg._id||keg.id}/inventory`, { method:'POST', body: JSON.stringify({
        currentWeightG: Number(weight),
        wastageMl: Number(waste || 0),
        wastageReason: Number(waste || 0) ? reason : undefined,
        glasses:  Number(glasses  || 0),
        pitchers: Number(pitchers || 0),
        towers:   Number(towers   || 0),
        locationId,
      })});
      setResult(r);
      setStep(4);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:480}}>
      <div className="addBottleModalHead">
        <h2>Keg Inventory</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{keg.kegTag}</b> · {keg.beerName}
      </p>
      {err && <p className="inlineMsg">{err}</p>}
      {pos === undefined && step === 1 && <p style={{color:'rgba(255,193,129,.6)',fontSize:13,margin:'0 0 10px'}}>Checking POS…</p>}
      {posMode && step < 4 && (
        <p className="kegPosNote">POS connected — sales for this keg come from the bills since {pos.since?new Date(pos.since).toLocaleString():'the last count'}.</p>
      )}

      {step === 1 && (
        <>
          <label className="addBottleField">
            <span>Current Weight of Keg (g) *</span>
            <input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 24500" autoFocus/>
          </label>
          {preview && (
            <div className="kegCalcBox">
              <div><span>Remaining Beer</span><b>{preview.remaining.toLocaleString()} ML</b></div>
              <div><span>Consumed This Cycle</span><b>{preview.consumed.toLocaleString()} ML</b></div>
            </div>
          )}
        </>
      )}

      {/* POS mode — review: consumed vs billed, wastage is derived, only the reason is asked */}
      {posMode && step === 2 && (
        <>
          <div className="kegCalcBox">
            <div><span>Remaining Beer</span><b>{preview?.remaining.toLocaleString()} ML</b></div>
            <div><span>Consumed (physical)</span><b>{preview?.consumed.toLocaleString()} ML</b></div>
            <div><span>Sold on POS</span><b style={{color:'#7dff9d'}}>{Number(pos.soldMl||0).toLocaleString()} ML</b></div>
            {Number(pos.ncMl||0) > 0 && <div><span>NC on POS</span><b>{Number(pos.ncMl).toLocaleString()} ML</b></div>}
            <div><span>Wastage</span><b style={{color:posWaste>0?'#ff7043':'#7dff9d'}}>{posWaste.toLocaleString()} ML</b></div>
          </div>
          {posWaste > 0 ? (
            <label className="addBottleField" style={{marginTop:14}}>
              <span>Reason for the {posWaste.toLocaleString()} ML wastage</span>
              <select value={reason} onChange={e=>setReason(e.target.value)} className="modalSelect">
                {KEG_WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          ) : (
            <p style={{color:'#7dff9d',fontSize:13,margin:'14px 0 0'}}>
              {preview && preview.consumed < posBilled
                ? `The POS billed ${(posBilled - preview.consumed).toLocaleString()} ML more than left the keg — no wastage.`
                : 'Everything that left the keg was billed — no wastage.'}
            </p>
          )}
        </>
      )}

      {/* Step 2 — wastage first, so sales can be checked against what was actually poured */}
      {!posMode && step === 2 && (
        <>
          <div className="kegCalcBox">
            <div><span>Remaining Beer</span><b>{preview?.remaining.toLocaleString()} ML</b></div>
            <div><span>Consumed This Cycle</span><b>{preview?.consumed.toLocaleString()} ML</b></div>
          </div>
          <p style={{color:'rgba(255,193,129,.75)',fontSize:13,margin:'14px 0 8px'}}>
            Record any wastage from this cycle — spillage, foam, line cleaning or other losses. Enter 0 if there was none.
          </p>
          <label className="addBottleField">
            <span>Wastage Quantity (ML)</span>
            <input type="number" min="0" value={waste} onChange={e=>setWaste(e.target.value)} placeholder="0" autoFocus/>
          </label>
          {Number(waste) > 0 && (
            <label className="addBottleField" style={{marginTop:12}}>
              <span>Reason</span>
              <select value={reason} onChange={e=>setReason(e.target.value)} className="modalSelect">
                {KEG_WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}
          <p style={{color:'rgba(255,193,129,.6)',fontSize:12,margin:'12px 0 0'}}>
            Beer available to sell after wastage: <b style={{color:'#ffc181'}}>{netPoured.toLocaleString()} ML</b>
          </p>
        </>
      )}

      {/* Step 3 — sales, capped by net poured */}
      {!posMode && step === 3 && (
        <>
          <div className="kegCalcBox">
            <div><span>Consumed This Cycle</span><b>{preview?.consumed.toLocaleString()} ML</b></div>
            <div><span>Wastage</span><b style={{color:'#ff7043'}}>{Number(waste||0).toLocaleString()} ML</b></div>
            <div><span>Net Poured</span><b>{netPoured.toLocaleString()} ML</b></div>
          </div>
          <p style={{color:'rgba(255,193,129,.75)',fontSize:13,margin:'14px 0 8px'}}>
            Record what was sold this cycle by serve type. Leave blank if none.
          </p>
          <div className="servesGrid">
            <div className="servesHead"><span>Serve</span><span>Size</span><span>Qty Sold</span><span>Value</span></div>
            <div className="servesRow">
              <span>Glass</span><span>{glassMl} ML</span>
              <input type="number" min="0" value={glasses} onChange={e=>setGlasses(e.target.value)} placeholder="0" autoFocus/>
              <b>{fmtINR(Number(glasses||0)*Number(beer?.pricing?.glass||0))}</b>
            </div>
            <div className="servesRow">
              <span>Pitcher</span><span>{pitcherMl} ML</span>
              <input type="number" min="0" value={pitchers} onChange={e=>setPitchers(e.target.value)} placeholder="0"/>
              <b>{fmtINR(Number(pitchers||0)*Number(beer?.pricing?.pitcher||0))}</b>
            </div>
            <div className="servesRow">
              <span>Tower</span><span>{towerMl} ML</span>
              <input type="number" min="0" value={towers} onChange={e=>setTowers(e.target.value)} placeholder="0"/>
              <b>{fmtINR(Number(towers||0)*Number(beer?.pricing?.tower||0))}</b>
            </div>
            <div className="servesTotal">
              <span>Total sold</span>
              <b style={{color: soldMl > netPoured ? '#ff7043' : undefined}}>
                {soldMl.toLocaleString()} ML · {fmtINR(salesValue)}
              </b>
            </div>
          </div>
          {soldMl > netPoured && (
            <p style={{color:'#ff7043',fontSize:12,margin:'10px 0 0'}}>
              Sales exceed the {netPoured.toLocaleString()} ML poured this cycle — reduce the serve counts.
            </p>
          )}
          {!beer && (
            <p style={{color:'rgba(255,193,129,.6)',fontSize:12,margin:'10px 0 0'}}>
              This keg isn't linked to a beer in your Beers list, so default serve sizes are used and sales value will be zero.
            </p>
          )}
        </>
      )}

      {step === 4 && result && (
        <div className="kegResultBox">
          <div><span>Remaining</span><b>{result.cycle.remainingMl.toLocaleString()} ML</b></div>
          <div><span>Consumed</span><b>{result.cycle.consumedMl.toLocaleString()} ML</b></div>
          <div><span>Wastage{result.cycle.posMode?' (auto)':''}</span><b style={{color:'#ff7043'}}>{result.cycle.wastageMl.toLocaleString()} ML</b></div>
          <div><span>Net Poured</span><b>{result.cycle.netConsumedMl.toLocaleString()} ML</b></div>
          <div><span>Sold{result.cycle.posMode?' (POS)':''}</span><b style={{color:'#7dff9d'}}>{(result.cycle.soldMl||0).toLocaleString()} ML</b></div>
          {result.cycle.posMode && Number(result.cycle.ncMl||0) > 0 && <div><span>NC (POS)</span><b>{Number(result.cycle.ncMl).toLocaleString()} ML</b></div>}
          <div><span>Sales Value</span><b style={{color:'#7dff9d'}}>{fmtINR(result.cycle.salesValue||0)}</b></div>
          <div style={{gridColumn:'1/-1'}}>
            <span>Variance (net poured − sold)</span>
            <b style={{color:Math.abs(result.cycle.varianceMl||0)>0?'#ffc446':'#7dff9d'}}>
              {(result.cycle.varianceMl||0).toLocaleString()} ML
            </b>
          </div>
          {result.isEmpty && (
            <p style={{gridColumn:'1/-1',color:'#ffc181',fontSize:13,margin:'10px 0 0'}}>
              This keg now reads empty. Use <b>Declare Keg Empty</b> to record the final wastage and close it.
            </p>
          )}
        </div>
      )}

      <div className="addBottleActions" style={{marginTop:18}}>
        {posMode ? <>
          {step === 1 && <button className="addBottleSave" onClick={submitPos}>Continue</button>}
          {step === 2 && <button className="addBottleSave" onClick={submitPos} disabled={loading}>{loading?'Saving…':'Save Inventory'}</button>}
        </> : <>
          {step === 1 && <button className="addBottleSave" onClick={submit} disabled={pos===undefined}>Continue</button>}
          {step === 2 && <button className="addBottleSave" onClick={submit}>Continue</button>}
          {step === 3 && <button className="addBottleSave" onClick={submit} disabled={loading||soldMl>netPoured}>{loading?'Saving…':'Save Inventory'}</button>}
        </>}
        {step === 4 && <>
          {result?.isEmpty && <button className="addBottleSave" onClick={()=>{ onClose(); onDeclareEmpty(result.keg); }}>Declare Keg Empty</button>}
          <button className="addBottleSave" onClick={onSaved}>Done</button>
        </>}
        {step !== 4 && <button className="addBottleCancel" onClick={onClose}>Cancel</button>}
      </div>
    </div></div>
  );
}

// ── Assign Keg to Bars ────────────────────────────────────────────────────────
function AssignKegModal({ keg, bars, onClose, onSaved, setMsg }) {
  const [sel, setSel] = useState(keg.assignments?.map(a => a.barId) || []);
  const [err, setErr] = useState('');
  const toggle = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  async function assign() {
    setErr('');
    if (!sel.length) return setErr('Select at least one bar');
    try {
      const payload = sel.map(id => {
        const b = bars.find(x => (x._id?.toString()||x.id) === id);
        return { barId: id, barName: b?.name || id };
      });
      await api(`/kegs/${keg._id||keg.id}/assign`, { method:'POST', body: JSON.stringify({ bars: payload }) });
      onSaved();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:460}}>
      <div className="addBottleModalHead">
        <h2>Assign Keg to Bar</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{keg.kegTag}</b> · {keg.beerName} · {(keg.remainingMl||0).toLocaleString()} ML remaining
      </p>
      {err && <p className="inlineMsg">{err}</p>}
      <div className="addBottleOutlets">
        <label>Select one or more bars</label>
        <div className="outletCheckGrid">
          {bars.map(b => {
            const id = b._id?.toString() || b.id;
            return (
              <label key={id} className={`outletCheckRow ${sel.includes(id)?'':'dimmed'}`}>
                <input type="checkbox" checked={sel.includes(id)} onChange={()=>toggle(id)}/>
                {b.name}
              </label>
            );
          })}
        </div>
        {bars.length === 0 && <p className="noData">No bars configured in this outlet.</p>}
      </div>
      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={assign}>Assign Keg</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Keg Wastage Modal ─────────────────────────────────────────────────────────
function KegWastageModal({ keg, onClose, onSaved, setMsg }) {
  const [waste,  setWaste]  = useState('');
  const [reason, setReason] = useState('Spillage');
  const [err,    setErr]    = useState('');

  async function save() {
    setErr('');
    if (!Number(waste)) return setErr('Enter a wastage quantity in ML');
    try {
      await api(`/kegs/${keg._id||keg.id}/wastage`, { method:'POST', body: JSON.stringify({ wasteMl:Number(waste), reason }) });
      onSaved();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:420}}>
      <div className="addBottleModalHead">
        <h2>Record Wastage</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 16px'}}>
        <b style={{color:'#fff'}}>{keg.kegTag}</b> · {(keg.remainingMl||0).toLocaleString()} ML remaining
      </p>
      {err && <p className="inlineMsg">{err}</p>}
      <label className="addBottleField">
        <span>Wastage Quantity (ML) *</span>
        <input type="number" value={waste} onChange={e=>setWaste(e.target.value)} placeholder="e.g. 250" autoFocus/>
      </label>
      <label className="addBottleField" style={{marginTop:12}}>
        <span>Reason *</span>
        <select value={reason} onChange={e=>setReason(e.target.value)}
                style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:'#fff',padding:'0 16px',fontSize:15}}>
          {KEG_WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={save}>Record Wastage</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Declare Keg Empty — final wastage is mandatory ────────────────────────────
function DeclareKegEmptyModal({ keg, onClose, onSaved, setMsg }) {
  const [waste,   setWaste]   = useState('');
  const [reason,  setReason]  = useState('Foam');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  async function close() {
    setErr('');
    if (waste === '') return setErr('Final wastage quantity is required before the keg can be closed. Enter 0 if there was none.');
    if (Number(waste) < 0) return setErr('Enter a valid wastage quantity');
    setLoading(true);
    try {
      await api(`/kegs/${keg._id||keg.id}/declare-empty`, { method:'POST', body: JSON.stringify({ finalWastageMl:Number(waste), reason }) });
      onSaved();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:460}}>
      <div className="addBottleModalHead">
        <h2>Declare Keg Empty</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>
      <p style={{color:'rgba(255,193,129,.7)',fontSize:14,margin:'0 0 6px'}}>
        <b style={{color:'#fff'}}>{keg.kegTag}</b> · {keg.beerName}
      </p>
      <p style={{color:'rgba(255,193,129,.6)',fontSize:13,margin:'0 0 16px'}}>
        {(keg.remainingMl||0).toLocaleString()} ML is still recorded against this keg. Record the final wastage to close it — this cannot be undone.
      </p>
      {err && <p className="inlineMsg">{err}</p>}
      <label className="addBottleField">
        <span>Final Wastage Quantity (ML) *</span>
        <input type="number" value={waste} onChange={e=>setWaste(e.target.value)} placeholder="Enter 0 if none" autoFocus/>
      </label>
      <label className="addBottleField" style={{marginTop:12}}>
        <span>Reason</span>
        <select value={reason} onChange={e=>setReason(e.target.value)}
                style={{height:50,borderRadius:12,border:'1.5px solid rgba(231,127,34,.5)',background:'rgba(0,0,0,.4)',color:'#fff',padding:'0 16px',fontSize:15}}>
          {KEG_WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleSave" onClick={close} disabled={loading}>{loading?'Closing…':'Close Keg'}</button>
        <button className="addBottleCancel" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ── Keg Lifecycle Modal ───────────────────────────────────────────────────────
function KegLifecycleModal({ keg, onClose, setMsg }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/kegs/${keg._id||keg.id}/history`)
      .then(setData)
      .catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
  }, []);

  const k = data?.keg || keg;

  return (
    <div className="modal"><div className="addBottleModal" style={{maxWidth:760}}>
      <div className="addBottleModalHead">
        <h2>{k.kegTag} — Lifecycle</h2>
        <button className="modalClose" onClick={onClose}>×</button>
      </div>

      <div className="kegDetailGrid">
        <div><span>Beer</span><b>{k.beerName}</b></div>
        <div><span>Capacity</span><b>{(k.capacityMl||0).toLocaleString()} ML</b></div>
        <div><span>Full Weight</span><b>{(k.fullWeightG||0).toLocaleString()} g</b></div>
        <div><span>Empty (Tare) Weight</span><b>{(k.tareWeightG||0).toLocaleString()} g</b></div>
        <div><span>Remaining</span><b>{(k.remainingMl||0).toLocaleString()} ML</b></div>
        <div><span>Total Consumed</span><b>{(k.totalConsumedMl||0).toLocaleString()} ML</b></div>
        <div><span>Total Wastage</span><b style={{color:'#ff7043'}}>{(k.totalWastageMl||0).toLocaleString()} ML</b></div>
        <div><span>Status</span><b>{kegStatusLabel(k)}</b></div>
        <div><span>Connected</span><b>{k.connectedAt ? new Date(k.connectedAt).toLocaleDateString() : '—'}</b></div>
        <div><span>Closed</span><b>{k.closedAt ? new Date(k.closedAt).toLocaleDateString() : '—'}</b></div>
      </div>

      {loading && <p style={{color:'rgba(255,193,129,.5)',padding:12}}>Loading history…</p>}

      {data && (
        <div className="kegTimeline">
          {data.logs.map(l => (
            <div key={l._id||l.id} className="kegTimelineRow">
              <span className={`kegPill ${l.type}`}>{l.type}</span>
              <div>
                <b>
                  {l.type === 'inventory' || l.type === 'closing'
                    ? `${l.openingMl ?? '—'} ML → ${l.remainingMl ?? '—'} ML · consumed ${l.consumedMl ?? 0} ML${l.wastageMl ? ` · wastage ${l.wastageMl} ML` : ''}`
                    : (l.note || l.wastageReason || '—')}
                </b>
                <small>{new Date(l.at).toLocaleString()}{l.locationName ? ` · ${l.locationName}` : ''}</small>
              </div>
            </div>
          ))}
          {data.logs.length === 0 && <p className="noData">No lifecycle events yet.</p>}
        </div>
      )}

      <div className="addBottleActions" style={{marginTop:18}}>
        <button className="addBottleCancel" onClick={onClose}>Close</button>
      </div>
    </div></div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
function App(){
  const [authUser, setAuthUser] = useState(null);
  const [access, setAccess] = useState({ isSubUser:false, sections:[], outletAccess:[], financialAccess:true });
  const [alerts, setAlerts] = useState([]);
  const [posLive, setPosLive] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [page,setCurrent]=useState('dashboard');const [stack,setStack]=useState([]);const [outlets,setOutlets]=useState([]);const [ctx,setCtx]=useState({outlet:null,location:null});const [products,setProducts]=useState([]);const [master,setMaster]=useState([]);const [stock,setStock]=useState([]);const [recent,setRecent]=useState([]);const [reports,setReports]=useState({});const [history,setHist]=useState([]);const [users,setUsers]=useState([]);const [stockSearch,setStockSearch]=useState('');const [toast,setToast]=useState('');const [categories,setCategories]=useState([]);const [pbIngredients,setPbIngredients]=useState([]);const [pbBatches,setPbBatches]=useState([]);

  function setPage(p){ if(p==='__BACK__'){setStack(s=>{const copy=[...s];setCurrent(copy.pop()||'dashboard');return copy});return;} setStack(s=>page===p?s:[...s,page]); setCurrent(p);}
  function setOutlet(o){setCtx({outlet:o,location:null})}
  function setLocation(l){setCtx(c=>({...c,location:l}))}

  async function loadAll(){
    // Sections a sub-user lacks return 403 by design, so each call is settled
    // independently — one refusal must not blank out everything else.
    const calls = [
      ['/outlets',        setOutlets,       []],
      ['/user-products',  setProducts,      []],
      ['/master-bottles', setMaster,        []],
      ['/inventory/recent',setRecent,       []],
      ['/history',        setHist,          []],
      ['/sub-users',      setUsers,         []],
      ['/categories',     setCategories,    []],
      ['/pb/ingredients', setPbIngredients, []],
    ];
    const results = await Promise.allSettled(calls.map(([url]) => api(url)));
    let expired = false;
    results.forEach((res, i) => {
      const [, setter, fallback] = calls[i];
      if (res.status === 'fulfilled') setter(res.value ?? fallback);
      else {
        if (res.reason?.message?.includes('expired')) expired = true;
        setter(fallback);          // 403 for a section they don't have — treat as empty
      }
    });
    if (expired) setSubscriptionExpired(true);
  }
  async function loadStock(){
    if(!ctx.outlet||!ctx.location) return;
    const oId=ctx.outlet._id||ctx.outlet.id;
    const lId=ctx.location._id?.toString()||ctx.location.id;
    try{ setStock(await api(`/stock?outletId=${oId}&locationId=${lId}`)); }
    catch(e){ setStock([]); setToast(e.message); }
  }
  async function loadProducts(){ try{ setProducts(await api('/user-products')); }catch{ setProducts([]); } }

  useEffect(()=>{ if(authUser) loadAll(); },[authUser]);
  // Pull the granted sections from the server rather than trusting the login payload,
  // so revoking access takes effect on refresh without a re-login.
  useEffect(()=>{
    if(!authUser) return;
    api('/me/access')
      .then(a=>setAccess({ ...a, sections:a.sections||[], outletAccess:a.outletAccess||[] }))
      .catch(()=>setAccess({ isSubUser:false, sections:[], outletAccess:[], financialAccess:true }));
    api('/alerts').then(r=>setAlerts(r.alerts||[])).catch(()=>{});
    api('/pos-stock/status').then(r=>setPosLive(Boolean(r.connected))).catch(()=>setPosLive(false));
  },[authUser]);

  async function dismissAlert(id){
    setAlerts(prev=>prev.filter(a=>a._id!==id));
    try{ await api(`/par-stock/${id}/dismiss`,{method:'POST'}); }catch{}
  }
  useEffect(()=>{ if(authUser) loadStock(); },[ctx.outlet?._id||ctx.outlet?.id, ctx.location?._id?.toString()||ctx.location?.id]);
  useEffect(()=>{ if(authUser) api('/reports').then(setReports).catch(()=>setReports([])); },[recent.length]);

  if(!authUser) return <LoginPage onLogin={(u)=>{ setAuthUser(u); }}/>;
  if(subscriptionExpired) return <SubscriptionExpired onLogout={()=>{ setToken(null); setAuthUser(null); setSubscriptionExpired(false); }}/>;

  // Owners see everything; sub-users only their ticked sections.
  const acl = {
    ...access,
    can: key => !access.isSubUser || (access.sections || []).includes(key),
    money: !access.isSubUser || access.financialAccess !== false,
  };
  // Outlets are filtered before they ever reach a page, so an unassigned outlet
  // is not selectable even if a stale page id is restored.
  const visibleOutlets = access.isSubUser && access.outletAccess?.length
    ? outlets.filter(o => access.outletAccess.includes(String(o._id || o.id)))
    : outlets;

  const common={setPage,ctx,setOutlet,setLocation};
  const views={
    dashboard:<Dashboard setPage={setPage} user={authUser} access={acl} alerts={alerts} onDismissAlert={dismissAlert} posLive={posLive}/>,
    outlet:<OutletPage setPage={setPage} outlets={visibleOutlets} setOutlet={setOutlet}/>,
    barselect:<BarSelect setPage={setPage} selectedOutlet={ctx.outlet} setLocation={setLocation}/>,
    stock:<StockPage {...common} stock={stock} stockSearch={stockSearch} setStockSearch={setStockSearch} refreshStock={loadStock}/>,
    inventory:<Inventory {...common} outlets={visibleOutlets} products={products} stock={stock} recent={recent} refreshRecent={async()=>{setRecent(await api('/inventory/recent'));loadStock();}}/>,
    products:<Products setPage={setPage} products={products} master={master} loadProducts={loadProducts} outlets={visibleOutlets} categories={categories}/>,
    report:<Report setPage={setPage} outlets={visibleOutlets} products={products} acl={acl}/>,
    history:<HistoryPage setPage={setPage} history={history} outlets={visibleOutlets}/>,
    posstock:<PosStockPage setPage={setPage} outlets={visibleOutlets} acl={acl}/>,
    transfer:<Transfer {...common} products={products} refreshStock={loadStock}/>,
    assign:<Transfer {...common} products={products} assign refreshStock={loadStock}/>,
    addStock:<AddStock {...common} products={products} refreshStock={loadStock}/>,
    prebatch:<PreBatch setPage={setPage} ctx={ctx} outlets={outlets} products={products} pbIngredients={pbIngredients} setPbIngredients={setPbIngredients} mode="stockroom"/>,
    prebatchbar:<PreBatch setPage={setPage} ctx={ctx} outlets={outlets} products={products} pbIngredients={pbIngredients} setPbIngredients={setPbIngredients} mode="bar"/>,
    keg:<KegModule setPage={setPage} ctx={ctx} products={products} master={master} outlets={outlets} mode="stockroom"/>,
    kegbar:<KegModule setPage={setPage} ctx={ctx} products={products} master={master} outlets={outlets} mode="bar"/>
  };
  // Which section each page belongs to. A sub-user landing on a page they were
  // not granted gets a refusal, not a blank screen.
  const PAGE_SECTION = {
    outlet:'outlets', barselect:'outlets', stock:'stockroom',
    inventory:'inventory', products:'products', report:'reports',
    history:'history', posstock:'pos', transfer:'transfers',
    assign:'assign', addStock:'addstock',
    prebatch:'prebatch', prebatchbar:'prebatch', keg:'keg', kegbar:'keg',
  };
  const needed = PAGE_SECTION[page];
  if (needed && !acl.can(needed)) {
    return <>
      <Shell setPage={setPage}>
        <div className="noAccess">
          <b>Access restricted</b>
          <p>Your account doesn't have access to this section. Ask your manager if you need it.</p>
          <button className="addBtn" onClick={()=>setPage('dashboard')}>Back to Dashboard</button>
        </div>
      </Shell>
      <Toast msg={toast}/>
    </>;
  }

  return <>{views[page]||views.dashboard}<Toast msg={toast}/></>;
}

createRoot(document.getElementById('root')).render(<App/>);
