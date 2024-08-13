import React from "react";
import styles from "../styles/Features.module.css"; // Import các lớp CSS như đối tượng 'styles'

function Features() {
  return (
    <section className={styles.features}>
      {" "}
      {/* Sử dụng lớp CSS từ CSS Module */}
      <div className={styles.container}>
        <div className={styles.featuresContent}>
          {" "}
          {/* Tên lớp từ CSS Module */}
          <h2>
            <span className={styles.highlight}>
              Affiliate Marketing Platform
            </span>{" "}
            - backbone for your{" "}
            <span className={styles.highlight}>Branding Actions</span> &amp;{" "}
            <span className={styles.highlight}>Engagement Blinks</span>
          </h2>
          <p>
            Connect brands with KOLs and KOCs effortlessly, leveraging Blinks
            without any worries about infrastructure!
          </p>
          <div className={styles.buttonGroup}>
            <button className={styles.primaryButton}>Get Started</button>{" "}
            {/* Sử dụng lớp CSS từ CSS Module */}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;
