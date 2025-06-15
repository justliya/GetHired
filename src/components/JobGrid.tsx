import React from "react";
import { motion } from "framer-motion";
import JobCard from "./JobCard";
import type { JobListing } from "../types";

interface JobGridProps {
  jobs: JobListing[];
  onResearch: (job: JobListing) => void;
  onFavoriteToggle: (job: JobListing) => void;
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

const JobGrid: React.FC<JobGridProps> = ({
  jobs,
  onResearch,
  onFavoriteToggle,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {jobs.map((job) => (
        <motion.div key={job.id} variants={itemVariants}>
          <JobCard
            job={job}
            onResearch={() => onResearch(job)}
            onFavoriteToggle={() => onFavoriteToggle(job)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default JobGrid;