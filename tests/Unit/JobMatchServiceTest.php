<?php

namespace Tests\Unit;

use App\Services\JobMatchService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JobMatchServiceTest extends TestCase
{
    #[Test]
    public function it_rejects_when_no_job_skill_overlaps_candidate(): void
    {
        $service = new JobMatchService();

        $result = $service->compute(
            ['php', 'laravel'],
            [
                ['skill' => 'python', 'credential_count' => 1, 'experience_count' => 1],
            ]
        );

        $this->assertTrue($result['rejected']);
        $this->assertSame('no_overlap', $result['rejection_reason']);
        $this->assertSame([], $result['matched_pairs']);
        $this->assertSame(0, $result['score_raw']);
        $this->assertSame(0.0, $result['score']);
    }

    #[Test]
    public function it_filters_out_unvalidated_skills_and_scores_correctly(): void
    {
        $service = new JobMatchService();

        $result = $service->compute(
            ['php', 'laravel', 'mysql', 'docker'],
            [
                // Has skill but no evidence => not validated
                ['skill' => 'php', 'credential_count' => 0, 'experience_count' => 0],

                // Validated overlaps
                ['skill' => 'laravel', 'credential_count' => 1, 'experience_count' => 0], // evidence 1
                ['skill' => 'mysql', 'credential_count' => 1, 'experience_count' => 1],   // evidence 2

                // Validated non-job skill
                ['skill' => 'git', 'credential_count' => 0, 'experience_count' => 3],
            ]
        );

        $this->assertFalse($result['rejected']);
        $this->assertSame(2, $result['score_raw']);
        $this->assertSame(50.0, $result['score']);
        $this->assertSame(0.5, $result['coverage']);
        $this->assertSame('Most skills covered', $result['coverage_label']);
        $this->assertSame(3, $result['breadth']); // laravel, mysql, git
        $this->assertSame(3, $result['evidence_sum']); // 1 + 2
        $this->assertArrayHasKey('laravel', $result['matched_pairs']);
        $this->assertArrayHasKey('mysql', $result['matched_pairs']);
    }

    #[Test]
    public function it_throws_on_empty_job_skills(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $service = new JobMatchService();
        $service->compute([], [
            ['skill' => 'php', 'credential_count' => 1, 'experience_count' => 1],
        ]);
    }
}
