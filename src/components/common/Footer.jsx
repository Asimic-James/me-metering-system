function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-sm">&copy; {new Date().getFullYear()} ME-JEDC Power Distribution. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;