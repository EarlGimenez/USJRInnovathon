<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * @deprecated Candidate-ranking was replaced by job-posting ranking.
 */
class JobCandidateRankingServiceTest extends TestCase
{
	#[Test]
	public function candidate_ranking_is_deprecated(): void
	{
		$this->markTestSkipped('Candidate-ranking was replaced by job-posting ranking for a single candidate.');
	}
}
