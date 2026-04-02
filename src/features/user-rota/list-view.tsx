import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { RotaDayStatus } from 'generated/prisma/enums'

type RotaDay = {
  id: string
  date: Date
  status: RotaDayStatus | null
}

const rota: Array< RotaDayStatus | null> = [
  "PAID", 
  null, 
  null, 
  "PAID", 
  "PAID", 
  null,  
  null,
];
// Two months of data
const defaultData : Array<RotaDay> = Array.from({ length: 56}, (_, i) => {
  let status: RotaDayStatus | null;
  if(i>=28){
    status = rota[i % 7] == "PAID" ? "CONTRACTED" : null; 
  } else {
    status = rota[i % 7];
  };
  let date = new Date(2026, 3, 25);
  date.setDate(date.getDate() + i);
  return {id: `${i}`, status: status, date: date }
});