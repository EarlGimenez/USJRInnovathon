<?php

namespace Tests\Unit;

use App\Services\JobMatchService;
use App\Services\JobPostingRankingService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JobPostingRankingServiceTest extends TestCase
{
    #[Test]
    public function it_ranks_jobs_by_score_then_evidence_sum_then_breadth(): void
    {
        $matcher = new JobMatchService();
        $ranking = new JobPostingRankingService($matcher);

        $candidateSkills = [
            ['skill' => 'php', 'credential_count' => 1, 'experience_count' => 1],
            ['skill' => 'laravel', 'credential_count' => 1, 'experience_count' => 1],
        ];

        $jobs = [
            [
                'id' => 'job-1',
                'job_skills' => ['php', 'laravel'],
            ],
            [
                'id' => 'job-2',
                'job_skills' => ['php'],
            ],
            [
                'id' => 'job-3',
                'job_skills' => ['python'],
            ],
        ];

        $ranked = $ranking->rank($candidateSkills, $jobs, 0.75);

        // job-1 and job-2 both score 100, but job-1 has higher evidence_sum (2+2 vs 2)
        $this->assertSame('job-1', $ranked[0]['id']);
        $this->assertSame('job-2', $ranked[1]['id']);
        $this->assertSame('job-3', $ranked[2]['id']);

        $this->assertSame(100.0, $ranked[0]['result']['score']);
        $this->assertSame(100.0, $ranked[1]['result']['score']);
        $this->assertTrue($ranked[2]['result']['rejected']);
    }
}
