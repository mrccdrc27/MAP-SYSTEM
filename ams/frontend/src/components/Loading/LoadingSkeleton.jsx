import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function SkeletonLoadingTh() {
  return (
    <th>
      <Skeleton />
    </th>
  );
}

function SkeletonLoadingTd() {
  return (
    <td>
      <Skeleton />
    </td>
  );
}

function SkeletonLoadingTable() {
  return (
    <table>
      <thead>
        <tr>
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
          <SkeletonLoadingTh />
        </tr>
      </thead>
      <tbody>
        <tr>
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
        </tr>
        <tr>
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
          <SkeletonLoadingTd />
        </tr>
      </tbody>
    </table>
  );
}

export { SkeletonLoadingTh, SkeletonLoadingTd, SkeletonLoadingTable };
