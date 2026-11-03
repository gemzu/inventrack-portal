/* One page-scroll lock shared by every panel, modal and menu.

   Each of them used to save body.style.overflow, set it to hidden and put the
   saved value back when it closed. Two open at once (the item panel, then a
   modal over it) closed in the other order and "restored" hidden, so the page
   stayed frozen after both were gone: the wheel did nothing, only Tab moved,
   until a refresh. A count cannot get out of order. */

let holders = 0;

export function lockScroll(): () => void {
  holders += 1;
  if (holders === 1) document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = "";
  };
}
