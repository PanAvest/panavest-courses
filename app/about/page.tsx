export default function AboutPage() {
  return (
    <main className="w-full px-4 md:px-6 py-10">
      <h1 className="text-3xl font-bold text-[#0a1156]">About KDS Learning</h1>

      <p className="mt-4 max-w-3xl text-muted">
        <strong>KDS Learning</strong> is a groundbreaking digital learning ecosystem
        <br />
        <strong>powered by <a href="https://panavest.com/" target="_blank" className="text-[#0a1156] underline">PanAvest International &amp; Partners</a></strong>,
        founded by <strong>Professor Douglas Boateng</strong> — Africa’s first Professor Extraordinaire
        in Supply and Value Chain Management and a globally recognized authority on governance,
        industrialisation, and leadership.
      </p>

      <p className="mt-4 max-w-3xl text-muted">
        The platform was born from the <strong>Knowledge Development Series (KDS)</strong> — a collection
        of internationally acclaimed books that simplify complex subjects such as Boardroom Governance,
        Strategic Sourcing, Industrialisation, and the Sustainable Development Goals (SDGs) into
        practical, context-driven learning experiences. KDS Learning transforms these works into interactive,
        verifiable online and mobile courses that combine academic excellence with African relevance.
      </p>

      <h2 className="mt-8 text-2xl font-semibold text-[#0a1156]">Our Vision &amp; Mission</h2>
      <p className="mt-3 max-w-3xl text-muted">
        Our vision is to make Africa’s professionals globally competitive through accessible, certified,
        and practical digital education. Our mission is to bridge the gap between classroom theory and
        boardroom practice by delivering real-world learning experiences backed by Continuing Professional
        and Personal Development (CPPD) certification.
      </p>

      <h2 className="mt-8 text-2xl font-semibold text-[#0a1156]">Why KDS Learning is Different</h2>
      <p className="mt-3 max-w-3xl text-muted">
        While most online platforms repurpose generic content, KDS Learning was built from the ground up
        for Africa’s transformation. It is rooted in local realities yet aligned with global standards.
        Each course and certification represents decades of executive insight, policy experience, and
        governance excellence drawn directly from Professor Boateng’s research and PanAvest’s extensive
        industry collaborations.
      </p>

      <h2 className="mt-8 text-2xl font-semibold text-[#0a1156]">Innovative Features &amp; Technology</h2>
      <ul className="list-disc ml-6 mt-3 space-y-2 text-muted max-w-3xl">
        <li>
          <strong>Supabase-Powered Backend:</strong> Secure authentication, real-time learning progress,
          and data privacy for every learner.
        </li>
        <li>
          <strong>Paystack Payments Integration:</strong> Seamless card, bank, and mobile money payments
          across Africa, making enrolment effortless.
        </li>
        <li>
          <strong>Digital Certificates with QR Verification:</strong> Every credential issued through KDS
          Learning carries a unique QR code and verification ID, allowing instant authenticity checks by
          employers and institutions.
        </li>
        <li>
          <strong>Secure E-Book Delivery:</strong> Licensed e-books and learning materials are protected
          through encrypted access, ensuring intellectual property integrity and safe offline reading.
        </li>
        <li>
          <strong>Interactive Exams &amp; Real-Time Results:</strong> Learners receive immediate feedback,
          progress analytics, and digital recognition for each completed module.
        </li>
        <li>
          <strong>Admin Intelligence Dashboard:</strong> Instructors and administrators access live analytics
          on course engagement, exam results, and learner achievements.
        </li>
        <li>
          <strong>Cloud-Synced Progress:</strong> Learners can start on web and continue seamlessly on mobile,
          maintaining their progress, assessments, and certificates.
        </li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold text-[#0a1156]">Mobile App Coming Soon</h2>
      <p className="mt-3 max-w-3xl text-muted">
        The upcoming <strong>KDS Mobile App</strong> will redefine digital learning accessibility across Africa.
        Built with <strong>React + Capacitor</strong>, the app allows learners to enrol, study, write quizzes,
        and download certificates directly from their smartphones — even offline. It bridges convenience,
        interactivity, and security into one powerful mobile experience.
      </p>

      <h2 className="mt-8 text-2xl font-semibold text-[#0a1156]">Our Promise</h2>
      <p className="mt-3 max-w-3xl text-muted">
        KDS Learning is more than an e-learning platform — it’s a movement to empower Africa through
        knowledge, governance, and technology. Backed by PanAvest’s decades-long commitment to industrial
        advancement, ethical leadership, and value-chain development, the platform continues to pioneer
        a new generation of certified professionals ready to shape Africa’s future.
      </p>

      <p className="mt-6 max-w-3xl text-muted">
        Visit <a href="https://panavest.com/" target="_blank" className="text-[#0a1156] underline">PanAvest.com</a> to learn more
        about our broader mission and initiatives driving industrialisation, governance excellence, and
        sustainable transformation across the continent.
      </p>
    </main>
  );
}
