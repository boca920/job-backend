import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Context } from "../../main";

const toAbsolute = (url, API_BASE) => {
  if (!url) return "/careerconnect-transparent.png";
  const lower = String(url).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
};

const getCompany = (job) => ({
  name: job?.postedBy?.name || "Company",
  image: job?.postedBy?.avatar?.url || "",
});

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [workType, setWorkType] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { API_BASE } = useContext(Context);

  useEffect(() => {
    fetchAllJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/v1/job/getall`, {
        withCredentials: true,
      });
      setJobs(res.data.jobs);
      setMessage("");
    } catch (error) {
      console.log(error);
      setMessage("Failed to fetch jobs.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const hasAnyFilter =
      query.trim() ||
      workType ||
      employmentType ||
      experience ||
      salaryMin ||
      salaryMax;

    if (!hasAnyFilter) {
      fetchAllJobs();
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (workType) params.set("workType", workType);
      if (employmentType) params.set("employmentType", employmentType);
      if (experience) params.set("experience", experience);
      if (salaryMin) params.set("salaryMin", salaryMin);
      if (salaryMax) params.set("salaryMax", salaryMax);

      const res = await axios.get(
        `${API_BASE}/api/v1/job/search?${params.toString()}`,
        { withCredentials: true }
      );

      if (!res.data.jobs || res.data.jobs.length === 0) {
        setMessage("No jobs found matching your search.");
        setJobs([]);
      } else {
        setMessage("");
        setJobs(res.data.jobs);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error fetching search results.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setWorkType("");
    setEmploymentType("");
    setExperience("");
    setSalaryMin("");
    setSalaryMax("");
    setMessage("");
    fetchAllJobs();
  };

  return (
    <section className="jobs page">
      <div className="container">
        <div className="jobs-header">
          <h1>ALL AVAILABLE JOBS</h1>
        </div>

        <form onSubmit={handleSearch} className="search-panel">
          <div className="search-row">
            <div className="field grow">
              <span className="label">Keyword</span>
              <input
                type="text"
                placeholder="Search for jobs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="control"
              />
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary">
                Search
              </button>
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>

          <div className="filters-row">
            <div className="field">
              <span className="label">Work Type</span>
              <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="control">
                <option value="">Any</option>
                <option value="Onsite">Onsite</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="field">
              <span className="label">Employment</span>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="control">
                <option value="">Any</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            <div className="field">
              <span className="label">Experience</span>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className="control">
                <option value="">Any</option>
                <option value="Entry">Entry</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </div>

            <div className="field">
              <span className="label">Salary Min</span>
              <input type="number" placeholder="0" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="control" min="0" />
            </div>

            <div className="field">
              <span className="label">Salary Max</span>
              <input type="number" placeholder="Any" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="control" min="0" />
            </div>
          </div>
        </form>

        {loading && <div className="notice">Loading…</div>}
        {!loading && message && <div className="notice">{message}</div>}

        <div className="banner">
          {jobs &&
            jobs.map((element) => {
              const company = getCompany(element);
              return (
                <div className="card" key={element._id}>
                  <div className="company-card-header">
                    <img
                      src={toAbsolute(company.image, API_BASE)}
                      alt={company.name}
                      className="company-logo"
                    />
                    <div>
                      <p className="company-name">{company.name}</p>
                      <p className="job-title">{element.title}</p>
                    </div>
                  </div>

                  <div className="card-top">
                    <span className="pill">{element.category}</span>
                  </div>

                  <div className="card-meta">
                    <span>{element.country}</span>
                    {element.city && <span>{element.city}</span>}
                  </div>

                  <Link className="details-link" to={`/job/${element._id}`}>
                    Job Details →
                  </Link>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
};

export default Jobs;
