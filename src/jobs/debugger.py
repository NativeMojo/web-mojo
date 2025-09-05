"""
Jobs Debugger Module
Debugging utilities for stuck jobs investigation
"""

from mojo.apps.jobs.models import Job
from django.utils import timezone
from datetime import timedelta


def debug_stuck_jobs(channel=None):
    """Debug function to analyze stuck jobs"""
    print(f"=== DEBUGGING STUCK JOBS{f' FOR CHANNEL: {channel}' if channel else ''} ===")

    # Get all jobs in the channel
    jobs_query = Job.objects.all()
    if channel:
        jobs_query = jobs_query.filter(channel=channel)

    # Look at pending jobs that might be stuck
    pending_jobs = jobs_query.filter(status='pending').order_by('created')
    print(f"Total pending jobs: {pending_jobs.count()}")

    for job in pending_jobs[:10]:  # Show first 10
        print(f"Job {job.id[:8]}...")
        print(f"  Status: {job.status}")
        print(f"  Channel: {job.channel}")
        print(f"  Created: {job.created}")
        print(f"  Started: {job.started_at}")
        print(f"  Runner: {job.runner_id}")
        print(f"  Attempt: {job.attempt}")
        print(f"  Max Retries: {job.max_retries}")
        print(f"  Expires: {job.expires_at}")

        # Check if it's actually stuck
        if job.expires_at and job.expires_at < timezone.now():
            print("  ❌ EXPIRED!")
        elif job.created < timezone.now() - timedelta(minutes=5) and job.status == 'pending':
            print("  ⚠️ POSSIBLY STUCK (pending > 5min)")
        else:
            print("  ✅ Seems normal")
        print()


def debug_clear_stuck_logic(channel=None):
    """See what the clearStuck logic identifies"""
    print(f"=== CLEAR STUCK LOGIC{f' FOR CHANNEL: {channel}' if channel else ''} ===")

    # This should match what your clearStuck API does
    # You'll need to check your actual clearStuck implementation
    jobs_query = Job.objects.all()
    if channel:
        jobs_query = jobs_query.filter(channel=channel)

    # Common stuck job criteria (adjust based on your actual logic):
    now = timezone.now()
    potentially_stuck = jobs_query.filter(
        status__in=['pending', 'running'],
        created__lt=now - timedelta(minutes=10)  # Adjust timeframe
    )

    print(f"Jobs potentially stuck (pending/running > 10min): {potentially_stuck.count()}")

    expired_jobs = jobs_query.filter(
        expires_at__lt=now,
        status__in=['pending', 'running']
    )

    print(f"Expired jobs still pending/running: {expired_jobs.count()}")

    return potentially_stuck, expired_jobs


def manual_clear_stuck(channel=None, dry_run=True):
    """Manually clear stuck jobs with detailed output"""
    print(f"=== MANUAL CLEAR STUCK{f' FOR CHANNEL: {channel}' if channel else ''} ===")
    print(f"DRY RUN: {dry_run}")

    potentially_stuck, expired_jobs = debug_clear_stuck_logic(channel)

    all_stuck = potentially_stuck.union(expired_jobs)

    print(f"Total jobs to clear: {all_stuck.count()}")

    cleared_count = 0
    for job in all_stuck:
        print(f"Clearing job {job.id[:8]}... - {job.status} - {job.channel}")
        if not dry_run:
            # Update job status to failed or cancelled
            job.status = 'failed'
            job.finished_at = timezone.now()
            job.last_error = 'Cleared as stuck job'
            job.save()
        cleared_count += 1

    if not dry_run:
        print(f"✅ Cleared {cleared_count} stuck jobs")
    else:
        print(f"🔍 Would clear {cleared_count} stuck jobs (dry run)")

    return cleared_count


def inspect_job(job_id):
    """Detailed inspection of a specific job"""
    try:
        job = Job.objects.get(id=job_id)
        print(f"=== JOB INSPECTION: {job_id} ===")
        print(f"ID: {job.id}")
        print(f"Function: {job.func}")
        print(f"Channel: {job.channel}")
        print(f"Status: {job.status}")
        print(f"Attempt: {job.attempt}/{job.max_retries}")
        print(f"Created: {job.created}")
        print(f"Started: {job.started_at}")
        print(f"Finished: {job.finished_at}")
        print(f"Expires: {job.expires_at}")
        print(f"Runner: {job.runner_id}")
        print(f"Last Error: {job.last_error}")
        print(f"Payload: {job.payload}")

        # Additional analysis
        now = timezone.now()
        if job.expires_at and job.expires_at < now:
            print("🚨 JOB HAS EXPIRED!")

        if job.status == 'pending' and job.created < now - timedelta(minutes=10):
            print("⚠️ Job has been pending for over 10 minutes")

        if job.status == 'running' and job.started_at and job.started_at < now - timedelta(hours=1):
            print("⚠️ Job has been running for over 1 hour")

        return job
    except Job.DoesNotExist:
        print(f"❌ Job {job_id} not found")
        return None


def jobs_summary(channel=None):
    """Get a summary of job statuses"""
    print(f"=== JOBS SUMMARY{f' FOR CHANNEL: {channel}' if channel else ''} ===")

    jobs_query = Job.objects.all()
    if channel:
        jobs_query = jobs_query.filter(channel=channel)

    # Status counts
    from django.db.models import Count
    status_counts = jobs_query.values('status').annotate(count=Count('status')).order_by('status')

    print("Status breakdown:")
    for item in status_counts:
        print(f"  {item['status']}: {item['count']}")

    # Channel breakdown if not filtering by channel
    if not channel:
        channel_counts = jobs_query.values('channel').annotate(count=Count('channel')).order_by('channel')
        print("\nChannel breakdown:")
        for item in channel_counts:
            print(f"  {item['channel']}: {item['count']}")

    # Recent activity
    recent_jobs = jobs_query.order_by('-created')[:5]
    print("\nMost recent jobs:")
    for job in recent_jobs:
        print(f"  {job.id[:8]}... - {job.status} - {job.channel} - {job.created}")


def find_old_pending_jobs(minutes=10, channel=None):
    """Find jobs that have been pending for too long"""
    cutoff = timezone.now() - timedelta(minutes=minutes)

    jobs_query = Job.objects.filter(
        status='pending',
        created__lt=cutoff
    )

    if channel:
        jobs_query = jobs_query.filter(channel=channel)

    jobs = jobs_query.order_by('created')

    print(f"=== JOBS PENDING > {minutes} MINUTES{f' IN CHANNEL: {channel}' if channel else ''} ===")
    print(f"Found {jobs.count()} jobs")

    for job in jobs:
        age_minutes = (timezone.now() - job.created).total_seconds() / 60
        print(f"Job {job.id[:8]}... - {job.channel} - pending for {age_minutes:.1f} minutes")

    return jobs


def quick_debug(channel='email'):
    """Quick debug function for common issues"""
    print(f"🔍 QUICK DEBUG FOR CHANNEL: {channel}")
    print("=" * 50)

    jobs_summary(channel)
    print()

    old_jobs = find_old_pending_jobs(5, channel)
    print()

    if old_jobs.exists():
        print("🔍 Inspecting first old pending job:")
        inspect_job(old_jobs.first().id)
