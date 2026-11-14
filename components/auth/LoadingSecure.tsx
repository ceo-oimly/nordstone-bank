"use client";

export default function LoadingSecure() {
  return <div className="secure-loading" role="status" aria-live="polite">
    <div className="secure-logo"><span>Y</span><i/></div>
    <div className="secure-progress"><i/></div>
    <p>Loading secure environment...</p>
  </div>;
}
