"use client";

import { useRouter } from "next/navigation";

export default function SendMoneyModal() {
  const router = useRouter();
  return <main className="transfer-picker-page"><div className="transfer-picker-backdrop"><section className="send-money-modal" role="dialog" aria-modal="true" aria-labelledby="send-money-title"><button type="button" className="transfer-modal-close" aria-label="Close" onClick={() => router.push("/dashboard")}>×</button><div className="send-money-icon">➤</div><h1 id="send-money-title">Send Money</h1><p>Swift and Secure Money Transfer</p><div className="transfer-choice-list"><a href="/transfer/local" className="transfer-choice"><span className="transfer-choice-icon local">⇄</span><span><strong>Local Transfer</strong><small>Easily send money locally</small><em>0% Handling charges</em></span><b>›</b></a><a href="/transfer/international" className="transfer-choice"><span className="transfer-choice-icon international">◎</span><span><strong>International Wire Transfer</strong><small>Wire transfer is executed under 72 hours</small><em>IBAN &amp; SWIFT code required</em></span><b>›</b></a></div><button type="button" className="transfer-picker-cancel" onClick={() => router.push("/dashboard")}>Close</button></section></div></main>;
}
