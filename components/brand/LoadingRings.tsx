import NordstoneMark from "@/components/brand/NordstoneMark";

export default function LoadingRings() {
  return <div className="loading-rings" aria-hidden="true">
    <i /><i /><i />
    <NordstoneMark className="loading-rings-mark" title="" />
  </div>;
}
