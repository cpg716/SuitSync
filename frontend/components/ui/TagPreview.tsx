import React from 'react';
import QRCode from 'react-qr-code';
import { Printer } from 'lucide-react';
import { Button } from './Button';
import { Checkbox } from './checkbox';

export default function TagPreview({ job }: { job: any }) {
  if (!job) return <div className="text-neutral-400">Select a job to preview the tag.</div>;
  const qrValue = `https://suitsync.app/ticket/${job.id}`;
  const alt = job.alterations || job;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          /* Hide everything except the tag when printing */
          body > *:not(.tag-preview-wrapper) {
            display: none !important;
          }
          .tag-preview-wrapper {
            width: 8.5in !important;
            height: 11in !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }
          .tag-preview {
            width: 4.25in !important;
            height: 11in !important;
            padding: 0.5in !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
          }
          /* Show fold line */
          .fold-line {
            display: block !important;
            position: absolute;
            left: 0;
            top: 5.5in;
            width: 4.25in;
            border-top: 1px dashed #ccc;
          }
          /* Guide text */
          .fold-guide {
            display: block !important;
            position: absolute;
            right: 4.5in;
            top: 5.4in;
            font-size: 8pt;
            color: #999;
            transform: rotate(-90deg);
            transform-origin: right;
          }
          /* Hide print button when printing */
          .print-button {
            display: none !important;
          }
        }
      `}</style>

      {/* Preview Container - Scales down for screen view */}
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="tag-preview-wrapper relative bg-white p-4">
          {/* Print Button */}
          <Button 
            onClick={handlePrint}
            className="print-button mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg mx-auto"
          >
            <Printer size={18} />
            Print Tag
          </Button>

          {/* Tag Preview - Scaled down for screen view */}
          <div className="tag-preview bg-white rounded-lg shadow-lg p-6 mx-auto" 
               style={{ 
                 width: '4.25in',
                 height: '11in',
                 transform: 'scale(0.5)',
                 transformOrigin: 'top center',
                 marginBottom: '-5.5in' // Compensate for scale
               }}>
            {/* Top Half */}
            <div className="mb-[5.5in]">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold tracking-widest">No. <span className="text-blue-600">{job.serial || job.id?.toString().padStart(5, '0')}</span></span>
                <span className="text-sm">Date: {job.date ? job.date : (job.scheduledDateTime ? new Date(job.scheduledDateTime).toLocaleDateString() : '')}</span>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 mb-6">
                <div className="text-sm">Name: <span className="font-semibold">{job.customerName || job.name || ''}</span></div>
                <div className="text-sm">Phone: <span className="font-semibold">{job.phone || ''}</span></div>
                <div className="text-sm">Address: <span className="font-semibold">{job.address || ''}</span></div>
                <div className="text-sm">Salesman: <span className="font-semibold">{job.salesman || ''}</span></div>
                <div className="text-sm">Price: <span className="font-semibold">${job.price || ''}</span></div>
              </div>

              {/* Alterations Section */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold mb-2">SLEEVES:</div>
                  <div className="flex flex-wrap gap-x-4 mb-2">
                    <Checkbox checked={!!alt.sleevesShorten} onCheckedChange={() => {}} id="SHORTEN" />
                    <Checkbox checked={!!alt.sleevesLengthen} onCheckedChange={() => {}} id="LENGTHEN" />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold mb-2">SIDES:</div>
                  <div className="flex flex-wrap gap-x-4 mb-2">
                    <Checkbox checked={!!alt.sidesTakeIn} onCheckedChange={() => {}} id="TAKE IN" />
                    <Checkbox checked={!!alt.sidesLetOut} onCheckedChange={() => {}} id="LET OUT" />
                    <Checkbox checked={!!alt.reduceFront} onCheckedChange={() => {}} id="REDUCE FRONT" />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold mb-2">PANTS:</div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-x-4">
                      <span className="text-sm font-bold w-16">WAIST:</span>
                      <Checkbox checked={!!alt.waistTakeIn} onCheckedChange={() => {}} id="TAKE IN" />
                      <Checkbox checked={!!alt.waistLetOut} onCheckedChange={() => {}} id="LET OUT" />
                    </div>
                    <div className="flex flex-wrap gap-x-4">
                      <span className="text-sm font-bold w-16">SEAT:</span>
                      <Checkbox checked={!!alt.seatTakeIn} onCheckedChange={() => {}} id="TAKE IN" />
                      <Checkbox checked={!!alt.seatLetOut} onCheckedChange={() => {}} id="LET OUT" />
                    </div>
                    <div className="flex flex-wrap gap-x-4">
                      <span className="text-sm font-bold w-16">CROTCH:</span>
                      <Checkbox checked={!!alt.crotchTakeIn} onCheckedChange={() => {}} id="TAKE IN" />
                      <Checkbox checked={!!alt.crotchLetOut} onCheckedChange={() => {}} id="LET OUT" />
                    </div>
                    <div className="flex flex-wrap gap-x-4">
                      <span className="text-sm font-bold w-16">BOTTOM:</span>
                      <Checkbox checked={!!alt.bottomPlain} onCheckedChange={() => {}} id="PLAIN" />
                      <Checkbox checked={!!alt.bottomCuff} onCheckedChange={() => {}} id="CUFF" />
                      <Checkbox checked={!!alt.bottomJean} onCheckedChange={() => {}} id="JEAN" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Half (after fold) */}
            <div>
              {/* Claim Check Section */}
              <div className="space-y-2 mb-6">
                <div className="text-sm">When Promised: <span className="font-semibold">{job.whenPromised || ''}</span></div>
                <div className="text-sm">Name: <span className="font-semibold">{job.customerName || job.name || ''}</span></div>
                <div className="text-sm">Salesman: <span className="font-semibold">{job.salesman || ''}</span></div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <QRCode
                  value={qrValue}
                  size={100}
                  title="SuitSync QR Code"
                />
              </div>

              {/* Store Info */}
              <div className="text-sm text-center font-bold tracking-wide">
                RIVERSIDE MEN'S SHOP<br />
                6470 Transit Rd., Depew, NY 14043<br />
                (716) 833-8401
              </div>
            </div>

            {/* Fold Line (only visible when printing) */}
            <div className="fold-line hidden" />
            <div className="fold-guide hidden">FOLD HERE</div>
          </div>
        </div>
      </div>
    </>
  );
} 