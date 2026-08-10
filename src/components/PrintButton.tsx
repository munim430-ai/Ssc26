'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn btn-info print-button"
      id="printbtn"
      title="Click here to print this result"
      onClick={() => window.print()}
    >
      Print
    </button>
  )
}
