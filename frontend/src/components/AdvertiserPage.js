import React from "react";
import styles from "../styles/AdvertiserPage.module.css";

function AdvertiserPage() {
  return (
    <div className={styles.advertiserPage}>
      <header className={styles.pageHeader}>
        <h1>Welcome to the Soliate</h1>
        <p className={styles.pageDescription}>
          Connect with top KOLs and KOCs to enhance your brand's reach.
        </p>
      </header>
      <section className={styles.features}>
        <div className={styles.feature}>
          <h2>Easy Campaign Creation</h2>
          <p>
            Effortlessly create and manage campaigns with our user-friendly
            interface.
          </p>
        </div>
        <div className={styles.feature}>
          <h2>Real-time Analytics</h2>
          <p>
            Track the performance of your campaigns with real-time data and
            insights.
          </p>
        </div>
        <div className={styles.feature}>
          <h2>Seamless Integration</h2>
          <p>Integrate with your existing tools and platforms effortlessly.</p>
        </div>
      </section>
    </div>
  );
}

export default AdvertiserPage;
