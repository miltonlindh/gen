// app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Välkommen</h1>
      <p className="mt-3 text-gray-700">
        Skapa trial, gör offert, generera PDF och skicka via e-post.
      </p>
      <ul className="mt-4 list-disc list-inside text-sm text-gray-600">
        <li><a className="underline" href="/trial">Aktivera trial</a></li>
        <li><a className="underline" href="/quotes/new">Skapa ny offert</a></li>
      </ul>
    </div>
  );
}
