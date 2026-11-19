// Real names appear as tributes in the fictional route. Distances are from the chapter start.
export const AANAS = [
  { id: 'kesavan', name: 'Guruvayur Kesavan', chapter: 0, at: 23, cloth: 1 },
  { id: 'sivasundar', name: 'Thiruvambadi Sivasundar', chapter: 0, at: 111, cloth: 3 },
  { id: 'paramekkavu-padmanabhan', name: 'Paramekkavu Sree Padmanabhan', chapter: 0, at: 207, cloth: 2 },
  { id: 'kalidasan', name: 'Chirakkal Kalidasan', chapter: 1, at: 44, cloth: 2 },
  { id: 'karnan', name: 'Mangalamkunnu Karnan', chapter: 1, at: 184, cloth: 4 },
  { id: 'vijayakrishnan', name: 'Ambalapuzha Vijayakrishnan', chapter: 2, at: 51, cloth: 3 },
  { id: 'sivaraju', name: 'Thrikkadavoor Sivaraju', chapter: 2, at: 176, cloth: 1 },
  { id: 'rajan', name: 'Pampadi Rajan', chapter: 3, at: 49, cloth: 4 },
  { id: 'guruvayur-padmanabhan', name: 'Guruvayur Padmanabhan', chapter: 3, at: 197, cloth: 2 },
  { id: 'ramachandran', name: 'Thechikottukavu Ramachandran', chapter: 4, at: 45, cloth: 1 },
  { id: 'chandrasekharan', name: 'Thiruvambadi Chandrasekharan', chapter: 4, at: 146, cloth: 3 },
  { id: 'rajendran', name: 'Paramekkavu Rajendran', chapter: 4, at: 261, cloth: 4 },
];

export function aanaAt(chapter, distance, placed) {
  return AANAS.find(aana => aana.chapter === chapter && distance >= aana.at && !placed.has(aana.id));
}
