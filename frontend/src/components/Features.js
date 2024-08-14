import React from "react";
import styles from "../styles/Features.module.css";

function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.featuresContent}>
          <h2>
            <span className={styles.highlight}>
              Affiliate Marketing Platform
            </span>{" "}
            - backbone for your{" "}
            <span className={styles.highlight}>Branding Actions</span> &amp;
            <span className={styles.highlight}>Engagement Blinks</span>
          </h2>
          <p>
            Connect brands with KOLs and KOCs effortlessly, leveraging Blinks
            without any worries about infrastructure!
          </p>
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <h3>Easy Connection</h3>
              <p>
                Seamlessly connect brands with influencers in just a few clicks.
              </p>
            </div>
            <div className={styles.featureItem}>
              <h3>Powerful Analytics</h3>
              <p>
                Track campaign performance with real-time data and insights.
              </p>
            </div>
            <div className={styles.featureItem}>
              <h3>Flexible Campaigns</h3>
              <p>
                Create and manage various types of influencer marketing
                campaigns.
              </p>
            </div>
            <div className={styles.featureItem}>
              <h3>Secure Payments</h3>
              <p>
                Hassle-free, secure payment system for both brands and
                influencers.
              </p>
            </div>
          </div>
          <div className={styles.testimonial}>
            <blockquote>
              "This platform revolutionized our influencer marketing strategy.
              It's a game-changer!"
            </blockquote>
            - John Doe, Marketing Director at TechCorp
          </div>
          <div className={styles.ctaSection}>
            <h3>Ready to amplify your brand's reach?</h3>
            <p>
              Join thousands of successful brands and influencers on our
              platform.
            </p>
            <div className={styles.buttonGroup}>
              <button className={styles.primaryButton}>Get Started</button>
              <button className={styles.secondaryButton}>Learn More</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;
