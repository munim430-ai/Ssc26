export default function BoardHeader() {
  return (
    <div id="main-header2">
      <div className="fleft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Bangladesh Education Board Logo" width={80} height={80} style={{ width: 80, padding: '5px 5px 5px 0', float: 'left' }} />
      </div>
      <div style={{ marginLeft: '80px' }}>
        <h4 style={{ color: 'white' }}>WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD</h4>
        <h5 style={{ color: 'white' }}>JSC/JDC/SSC/DAKHIL/HSC/ALIM AND EQUIVALENT EXAMINATION</h5>
      </div>
    </div>
  )
}
