import test from 'node:test';
import assert from 'node:assert/strict';
import {createTreasurerReport} from '../finance-report.js';

test('treasurer report creates a multi-section PDF for the selected period',async()=>{
 const pdf=await createTreasurerReport({from:'2026-10-01',to:'2026-10-31',preparedBy:'Treasurer',transactions:[{date:'2026-10-05',description:'Donation',type:'Income',amount:100,category:'Donations'},{date:'2026-10-06',description:'Supplies',type:'Expense',amount:25,category:'Program Expenses'}],reimbursements:[{date:'2026-10-07',description:'Printing',requestor:'Mike',program:'Outreach',status:'Submitted',amount:30}],budgets:[{program:'Program Expenses',amount:250}]});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>4000);assert.match(pdf.toString('latin1'),/Treasurer Report/);assert.match(pdf.toString('latin1'),/\/Type \/Page/);
});
