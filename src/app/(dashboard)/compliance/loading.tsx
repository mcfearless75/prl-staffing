// /compliance re-syncs every record's status before rendering, so a tile click
// takes a moment; without this the page looked like the click did nothing.
export default function ComplianceLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-gray-500">
      <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      Loading compliance…
    </div>
  );
}
